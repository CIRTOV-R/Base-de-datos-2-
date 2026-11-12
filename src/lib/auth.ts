import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { LOCK_MINUTES, MAX_LOGIN_ATTEMPTS, normalizeEmail } from "@/lib/security";
import type { Usuario } from "@prisma/client";

export type PasswordCheck =
  | { ok: true; user: Usuario }
  | { ok: false; user: Usuario | null; error: string; locked: boolean };

export async function findActiveUser(email: string): Promise<Usuario | null> {
  const user = await prisma.usuario.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || !user.activo) return null;
  return user;
}

export async function verifyUserPassword(email: string, password: string): Promise<PasswordCheck> {
  const user = await findActiveUser(email);

  if (!user || !user.passwordHash) {
    return {
      ok: false,
      user: null,
      error: "Correo o contrasena incorrectos.",
      locked: false,
    };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000));
    return {
      ok: false,
      user,
      error: `Cuenta bloqueada por intentos fallidos. Intenta de nuevo en ${minutes} minuto(s).`,
      locked: true,
    };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failedAttempts = user.failedAttempts + 1;
    const shouldLock = failedAttempts >= MAX_LOGIN_ATTEMPTS;
    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        failedAttempts: shouldLock ? 0 : failedAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
      },
    });
    return {
      ok: false,
      user,
      error: shouldLock
        ? `Demasiados intentos fallidos. Cuenta bloqueada por ${LOCK_MINUTES} minutos.`
        : `Correo o contrasena incorrectos. Intentos restantes: ${
            MAX_LOGIN_ATTEMPTS - failedAttempts
          }.`,
      locked: shouldLock,
    };
  }

  return { ok: true, user };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPasswordHash(hash: string | null, password: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}
