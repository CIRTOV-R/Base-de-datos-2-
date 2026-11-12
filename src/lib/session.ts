import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  generateToken,
  getClientIp,
  getUserAgent,
  sha256Hex,
} from "@/lib/security";
import type { Rol, Usuario } from "@prisma/client";

export type SessionUser = Pick<
  Usuario,
  "id" | "nombre" | "email" | "rol" | "mfaEnabled" | "provider" | "lastLogin"
>;

export type ActiveSession = {
  id: string;
  mfaVerified: boolean;
  expiresAt: Date;
  createdAt: Date;
  ip: string | null;
  userAgent: string | null;
  usuario: SessionUser;
};

const userSelect = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  mfaEnabled: true,
  provider: true,
  lastLogin: true,
} as const;

export async function createSession(
  usuarioId: string,
  options: { mfaVerified: boolean; req: Request }
): Promise<string> {
  const token = generateToken();
  const ttl = options.mfaVerified ? SESSION_TTL_MS : 10 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttl);

  const sesion = await prisma.sesion.create({
    data: {
      usuarioId,
      tokenHash: sha256Hex(token),
      mfaVerified: options.mfaVerified,
      expiresAt,
      ip: getClientIp(options.req),
      userAgent: getUserAgent(options.req),
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ttl / 1000),
  });

  if (options.mfaVerified) {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { lastLogin: new Date(), failedAttempts: 0, lockedUntil: null },
    });
  }

  return sesion.id;
}

export async function getSession(): Promise<ActiveSession | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sesion = await prisma.sesion.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { usuario: { select: userSelect } },
  });
  if (!sesion || !sesion.usuario) return null;

  if (sesion.expiresAt.getTime() < Date.now()) {
    await prisma.sesion.delete({ where: { id: sesion.id } }).catch(() => undefined);
    return null;
  }

  return {
    id: sesion.id,
    mfaVerified: sesion.mfaVerified,
    expiresAt: sesion.expiresAt,
    createdAt: sesion.createdAt,
    ip: sesion.ip,
    userAgent: sesion.userAgent,
    usuario: sesion.usuario,
  };
}

export async function markSessionVerified(sessionId: string): Promise<void> {
  const sesion = await prisma.sesion.update({
    where: { id: sessionId },
    data: { mfaVerified: true, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  await prisma.usuario.update({
    where: { id: sesion.usuarioId },
    data: { lastLogin: new Date(), failedAttempts: 0, lockedUntil: null },
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.sesion
      .deleteMany({ where: { tokenHash: sha256Hex(token) } })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

export async function revokeOtherSessions(usuarioId: string, keepId: string): Promise<void> {
  await prisma.sesion.deleteMany({
    where: { usuarioId, id: { not: keepId } },
  });
}

export async function requireSession(): Promise<ActiveSession> {
  const sesion = await getSession();
  if (!sesion) redirect("/login");
  if (!sesion.mfaVerified) redirect("/login/mfa");
  return sesion;
}

export async function requireRole(roles: Rol[]): Promise<ActiveSession> {
  const sesion = await requireSession();
  if (!roles.includes(sesion.usuario.rol as Rol)) redirect("/dashboard?denied=1");
  return sesion;
}
