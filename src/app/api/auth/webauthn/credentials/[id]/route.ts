import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const sesion = await getSession();
  if (!sesion || !sesion.mfaVerified) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const credential = await prisma.webAuthnCredential.findFirst({
    where: { id, usuarioId: sesion.usuario.id },
  });
  if (!credential) {
    return NextResponse.json({ error: "Credencial no encontrada." }, { status: 404 });
  }

  await prisma.webAuthnCredential.delete({ where: { id: credential.id } });
  await logAudit({
    usuarioId: sesion.usuario.id,
    email: sesion.usuario.email,
    accion: "webauthn.eliminado",
    detalle: credential.deviceType || "Credencial biometrica eliminada.",
    req,
  });

  return NextResponse.json({ ok: true });
}
