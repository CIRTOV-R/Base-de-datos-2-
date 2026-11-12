import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/session";
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
  const target = await prisma.sesion.findFirst({
    where: { id, usuarioId: sesion.usuario.id },
  });
  if (!target) {
    return NextResponse.json({ error: "Sesion no encontrada." }, { status: 404 });
  }

  if (target.id === sesion.id) {
    await destroySession();
  } else {
    await prisma.sesion.delete({ where: { id: target.id } });
  }

  await logAudit({
    usuarioId: sesion.usuario.id,
    email: sesion.usuario.email,
    accion: "sesion.revocada",
    detalle: target.id === sesion.id ? "El usuario cerro su sesion actual." : "Sesion remota revocada.",
    req,
  });

  return NextResponse.json({ ok: true, current: target.id === sesion.id });
}
