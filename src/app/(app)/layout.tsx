import { requireSession } from "@/lib/session";
import { QUERY_CATALOG, ROLE_LABELS, can } from "@/lib/permissions";
import AppShell, { type NavItem } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requireSession();
  const rol = sesion.usuario.rol;

  const nav: NavItem[] = [];
  if (can(rol, "dashboard.view")) nav.push({ href: "/dashboard", label: "Panel general", icon: "dashboard" });
  if (QUERY_CATALOG.some((q) => can(rol, q.permiso))) {
    nav.push({ href: "/consultas", label: "Consultas SQL", icon: "queries" });
  }
  if (can(rol, "usuarios.manage")) nav.push({ href: "/usuarios", label: "Usuarios", icon: "users" });
  if (can(rol, "auditoria.view")) nav.push({ href: "/auditoria", label: "Auditoria", icon: "audit" });
  nav.push({ href: "/seguridad", label: "Seguridad", icon: "security" });

  return (
    <AppShell
      user={{
        nombre: sesion.usuario.nombre,
        email: sesion.usuario.email,
        rol: sesion.usuario.rol,
        rolLabel: ROLE_LABELS[sesion.usuario.rol],
        mfaEnabled: sesion.usuario.mfaEnabled,
      }}
      nav={nav}
    >
      {children}
    </AppShell>
  );
}
