import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions";
import SecurityPanel from "./security-panel";

export default async function SeguridadPage() {
  const sesion = await requireSession();

  const [user, credentials, sessions] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: sesion.usuario.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        provider: true,
        mfaEnabled: true,
        lastLogin: true,
        createdAt: true,
        passwordHash: true,
      },
    }),
    prisma.webAuthnCredential.findMany({
      where: { usuarioId: sesion.usuario.id },
      select: { id: true, deviceType: true, createdAt: true, backedUp: true, transports: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sesion.findMany({
      where: { usuarioId: sesion.usuario.id, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true, ip: true, userAgent: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) return null;

  return (
    <SecurityPanel
      user={{
        nombre: user.nombre,
        email: user.email,
        rol: ROLE_LABELS[user.rol],
        provider: user.provider,
        mfaEnabled: user.mfaEnabled,
        lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        hasPassword: Boolean(user.passwordHash),
      }}
      credentials={credentials.map((c) => ({
        id: c.id,
        deviceType: c.deviceType,
        backedUp: c.backedUp,
        transports: c.transports,
        createdAt: c.createdAt.toISOString(),
      }))}
      sessions={sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        ip: s.ip,
        userAgent: s.userAgent,
      }))}
      currentSessionId={sesion.id}
    />
  );
}
