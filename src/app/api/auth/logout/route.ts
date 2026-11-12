import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const sesion = await getSession();
  await destroySession();

  if (sesion) {
    await logAudit({
      usuarioId: sesion.usuario.id,
      email: sesion.usuario.email,
      accion: "logout",
      req,
    });
  }

  return NextResponse.json({ ok: true });
}
