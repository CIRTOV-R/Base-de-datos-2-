import { NextResponse } from "next/server";
import { getSession, revokeOtherSessions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPasswordHash } from "@/lib/auth";
import { isJsonRequest, isSameOrigin, passwordPolicyErrors } from "@/lib/security";
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
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  const user = await prisma.usuario.findUnique({ where: { id: sesion.usuario.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "Tu cuenta usa SSO. Gestiona la contrasena desde tu proveedor de identidad." },
      { status: 400 }
    );
  }

  const currentOk = await verifyPasswordHash(user.passwordHash, currentPassword);
  if (!currentOk) {
    return NextResponse.json({ error: "La contrasena actual es incorrecta." }, { status: 401 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Las contrasenas nuevas no coinciden." }, { status: 400 });
  }

  const policyErrors = passwordPolicyErrors(newPassword);
  if (policyErrors.length > 0) {
    return NextResponse.json({ error: policyErrors.join(" ") }, { status: 400 });
  }

  const reused = await verifyPasswordHash(user.passwordHash, newPassword);
  if (reused) {
    return NextResponse.json(
      { error: "La nueva contrasena debe ser diferente a la actual." },
      { status: 400 }
    );
  }

  await prisma.usuario.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  await revokeOtherSessions(user.id, sesion.id);
  await logAudit({
    usuarioId: user.id,
    email: user.email,
    accion: "password.cambiado",
    detalle: "El usuario cambio su contrasena y se revocaron las demas sesiones.",
    req,
  });

  return NextResponse.json({ ok: true });
}
