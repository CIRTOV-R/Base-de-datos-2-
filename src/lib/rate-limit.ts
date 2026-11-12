import { prisma } from "@/lib/db";
import { ATTEMPT_WINDOW_MINUTES, MAX_LOGIN_ATTEMPTS } from "@/lib/security";

export type RateLimitState = {
  limited: boolean;
  remaining: number;
  retryAfterMinutes: number;
};

export async function checkLoginRateLimit(
  identificador: string,
  ip: string
): Promise<RateLimitState> {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000);
  const attempts = await prisma.intentoLogin.count({
    where: {
      createdAt: { gte: since },
      exito: false,
      OR: [{ identificador }, { ip }],
    },
  });
  const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - attempts);
  return {
    limited: remaining === 0,
    remaining,
    retryAfterMinutes: ATTEMPT_WINDOW_MINUTES,
  };
}

export async function recordLoginAttempt(
  identificador: string,
  ip: string,
  exito: boolean
): Promise<void> {
  await prisma.intentoLogin.create({ data: { identificador, ip, exito } });
}

export async function clearLoginAttempts(identificador: string, ip: string): Promise<void> {
  await prisma.intentoLogin.deleteMany({
    where: { OR: [{ identificador }, { ip }] },
  });
}
