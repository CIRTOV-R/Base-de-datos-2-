import { Rol } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import UsersManager from "./users-manager";

export default async function UsuariosPage() {
  const sesion = await requireRole([Rol.ADMIN]);

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

  return (
    <UsersManager
      usuarios={usuarios.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        activo: u.activo,
        mfaEnabled: u.mfaEnabled,
        provider: u.provider,
        lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
        lockedUntil: u.lockedUntil ? u.lockedUntil.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
      }))}
      currentUserId={sesion.usuario.id}
    />
  );
}
