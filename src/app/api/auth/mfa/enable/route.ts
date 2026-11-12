import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { generateRecoveryCodes, hashRecoveryCodes, verifyTotp } from "@/lib/totp";
import { isJsonRequest, isSameOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req) || !isJsonRequest(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const sesion = await getSession();
  if (!sesion || !sesion.mfaVerified) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const code = String(body.code ?? "").trim();

  const user = await prisma.usuario.findUnique({ where: { id: sesion.usuario.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  if (user.mfaEnabled) {
    return NextResponse.json({ error: "MFA ya esta activo." }, { status: 400 });
  }
  if (!user.mfaSecret) {
    return NextResponse.json(
      { error: "Primero inicia la configuracion del autenticador." },
      { status: 400 }
    );
  }

  if (!verifyTotp(user.mfaSecret, code)) {
    return NextResponse.json(
      { error: "Codigo invalido. Verifica la hora de tu dispositivo e intenta de nuevo." },
      { status: 400 }
    );
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.usuario.update({
    where: { id: user.id },
    data: {
      mfaEnabled: true,
      mfaRecoveryCodes: hashRecoveryCodes(recoveryCodes),
    },
  });

  await logAudit({
    usuarioId: user.id,
    email: user.email,
    accion: "mfa.activado",
    detalle: "El usuario activo TOTP y genero codigos de recuperacion.",
    req,
  });

  return NextResponse.json({ ok: true, recoveryCodes });
}
