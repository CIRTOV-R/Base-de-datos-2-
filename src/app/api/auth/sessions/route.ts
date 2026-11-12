import { NextResponse } from "next/server";
import { getSession, revokeOtherSessions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const sesion = await getSession();
  if (!sesion || !sesion.mfaVerified) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const sessions = await prisma.sesion.findMany({
    where: { usuarioId: sesion.usuario.id, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      ip: true,
      userAgent: true,
      mfaVerified: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    current: sesion.id,
    sessions: sessions.map((s) => ({ ...s, current: s.id === sesion.id })),
  });
}

export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const sesion = await getSession();
  if (!sesion || !sesion.mfaVerified) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  await revokeOtherSessions(sesion.usuario.id, sesion.id);
  await logAudit({
    usuarioId: sesion.usuario.id,
    email: sesion.usuario.email,
    accion: "sesiones.revocadas",
    detalle: "Se revocaron todas las sesiones excepto la actual.",
    req,
  });

  return NextResponse.json({ ok: true });
}
