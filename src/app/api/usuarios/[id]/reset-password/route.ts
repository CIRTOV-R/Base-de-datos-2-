import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { isJsonRequest, isSameOrigin, passwordPolicyErrors } from "@/lib/security";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req) || !isJsonRequest(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const sesion = await getSession();
  if (!sesion || !sesion.mfaVerified) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!can(sesion.usuario.rol, "usuarios.manage")) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const password = String(body.password ?? "");

  const policyErrors = passwordPolicyErrors(password);
  if (policyErrors.length > 0) {
    return NextResponse.json({ error: policyErrors.join(" ") }, { status: 400 });
  }

  const target = await prisma.usuario.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  await prisma.usuario.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(password),
      failedAttempts: 0,
      lockedUntil: null,
    },
  });
  await prisma.sesion.deleteMany({ where: { usuarioId: id } });

  await logAudit({
    usuarioId: sesion.usuario.id,
    email: sesion.usuario.email,
    accion: "usuario.password_reseteado",
    detalle: `Se restablecio la contrasena de ${target.email} y se revocaron sus sesiones.`,
    req,
  });

  return NextResponse.json({ ok: true });
}
