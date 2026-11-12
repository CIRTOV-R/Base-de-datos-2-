import { NextResponse } from "next/server";
import { Prisma, Rol } from "@prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { isJsonRequest, isSameOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const VALID_ROLES = new Set(Object.values(Rol));

export async function PATCH(
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
  const body = (await req.json().catch(() => ({}))) as {
    rol?: string;
    activo?: boolean;
    unlock?: boolean;
  };

  const target = await prisma.usuario.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (body.rol !== undefined && !VALID_ROLES.has(body.rol as Rol)) {
    return NextResponse.json({ error: "Rol invalido." }, { status: 400 });
  }

  if (target.id === sesion.usuario.id) {
    if (body.rol && body.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "No puedes quitarte el rol de administrador a ti mismo." },
        { status: 400 }
      );
    }
    if (body.activo === false) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta." },
        { status: 400 }
      );
    }
  }

  const data: Prisma.UsuarioUpdateInput = {};
  if (body.rol) data.rol = body.rol as Rol;
  if (typeof body.activo === "boolean") data.activo = body.activo;
  if (body.unlock) {
    data.failedAttempts = 0;
    data.lockedUntil = null;
  }

  const updated = await prisma.usuario.update({ where: { id }, data });

  if (body.activo === false) {
    await prisma.sesion.deleteMany({ where: { usuarioId: id } });
  }

  await logAudit({
    usuarioId: sesion.usuario.id,
    email: sesion.usuario.email,
    accion: "usuario.actualizado",
    detalle: `Usuario ${updated.email}: ${JSON.stringify({ rol: body.rol, activo: body.activo, unlock: body.unlock })}`,
    req,
  });

  return NextResponse.json({
    ok: true,
    usuario: { id: updated.id, rol: updated.rol, activo: updated.activo },
  });
}
