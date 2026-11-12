import { NextResponse } from "next/server";
import { Rol } from "@prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  isJsonRequest,
  isSameOrigin,
  normalizeEmail,
  passwordPolicyErrors,
} from "@/lib/security";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const VALID_ROLES = new Set(Object.values(Rol));

export async function GET() {
  const sesion = await getSession();
  if (!sesion || !sesion.mfaVerified) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!can(sesion.usuario.rol, "usuarios.manage")) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      mfaEnabled: true,
      provider: true,
      lastLogin: true,
      lockedUntil: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ usuarios });
}

export async function POST(req: Request) {
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

  const body = (await req.json().catch(() => ({}))) as {
    nombre?: string;
    email?: string;
    rol?: string;
    password?: string;
  };

  const nombre = String(body.nombre ?? "").trim();
  const email = normalizeEmail(String(body.email ?? ""));
  const rol = String(body.rol ?? "");
  const password = String(body.password ?? "");

  if (nombre.length < 3) {
    return NextResponse.json({ error: "El nombre debe tener al menos 3 caracteres." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Correo electronico invalido." }, { status: 400 });
  }
  if (!VALID_ROLES.has(rol as Rol)) {
    return NextResponse.json({ error: "Rol invalido." }, { status: 400 });
  }
  const policyErrors = passwordPolicyErrors(password);
  if (policyErrors.length > 0) {
    return NextResponse.json({ error: policyErrors.join(" ") }, { status: 400 });
  }

  const exists = await prisma.usuario.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });
  }

  const user = await prisma.usuario.create({
    data: {
      nombre,
      email,
      rol: rol as Rol,
      passwordHash: await hashPassword(password),
      emailVerified: new Date(),
    },
  });

  await logAudit({
    usuarioId: sesion.usuario.id,
    email: sesion.usuario.email,
    accion: "usuario.creado",
    detalle: `Se creo el usuario ${user.email} con rol ${user.rol}.`,
    req,
  });

  return NextResponse.json({
    ok: true,
    usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
  });
}
