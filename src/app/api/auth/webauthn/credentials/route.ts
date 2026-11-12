import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const sesion = await getSession();
  if (!sesion || !sesion.mfaVerified) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const credentials = await prisma.webAuthnCredential.findMany({
    where: { usuarioId: sesion.usuario.id },
    select: {
      id: true,
      deviceType: true,
      createdAt: true,
      backedUp: true,
      transports: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ credentials });
}
