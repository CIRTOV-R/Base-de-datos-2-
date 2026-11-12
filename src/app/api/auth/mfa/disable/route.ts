import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { consumeRecoveryCode, verifyTotp } from "@/lib/totp";
import { verifyPasswordHash } from "@/lib/auth";
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

  const body = (await req.json().catch(() => ({}))) as {
    password?: string;
    code?: string;
  };

  const user = await prisma.usuario.findUnique({ where: { id: sesion.usuario.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  if (!user.mfaEnabled) {
    return NextResponse.json({ error: "MFA no esta activo." }, { status: 400 });
  }

  if (user.passwordHash) {
    const passwordOk = await verifyPasswordHash(user.passwordHash, String(body.password ?? ""));
    if (!passwordOk) {
      return NextResponse.json({ error: "Contrasena incorrecta." }, { status: 401 });
    }
  }

  const code = String(body.code ?? "").trim();
  const totpOk = user.mfaSecret ? verifyTotp(user.mfaSecret, code) : false;
  const recovery = consumeRecoveryCode(user.mfaRecoveryCodes, code);
  if (!totpOk && !recovery.ok) {
    return NextResponse.json(
      { error: "Codigo MFA invalido. No se puede desactivar la proteccion." },
      { status: 401 }
    );
  }

  await prisma.usuario.update({
    where: { id: user.id },
    data: { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [] },
  });

  await logAudit({
    usuarioId: user.id,
    email: user.email,
    accion: "mfa.desactivado",
    detalle: "El usuario desactivo la autenticacion multifactor.",
    req,
  });

  return NextResponse.json({ ok: true });
}
