"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Users,
  ShieldCheck,
  ScrollText,
  LogOut,
  Leaf,
  Menu,
  X,
  Fingerprint,
  CircleUser,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "queries" | "users" | "audit" | "security";
};

export type ShellUser = {
  nombre: string;
  email: string;
  rol: string;
  rolLabel: string;
  mfaEnabled: boolean;
};

const ICONS = {
  dashboard: LayoutDashboard,
  queries: LineChart,
  users: Users,
  audit: ScrollText,
  security: ShieldCheck,
} as const;

export default function AppShell({
  user,
  nav,
  children,
}: {
  user: ShellUser;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = user.nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pt-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-200">
          <Leaf className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">EcoMarket Vital</p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-brand-300">Gestion</p>
        </div>
      </div>

      <nav className="mt-8 flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-brand-500/15 font-semibold text-white"
                  : "text-brand-100/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${active ? "text-brand-300" : "text-brand-300/60"}`} />
              {item.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-300" />}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-4 rounded-2xl bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-400/20 text-xs font-bold text-brand-100">
            {initials || <CircleUser className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{user.nombre}</p>
            <p className="truncate text-[10px] text-brand-200/70">{user.rolLabel}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-black/10 px-2 py-1.5 text-[10px] text-brand-100/80">
          <span className="flex items-center gap-1.5">
            <Fingerprint className="h-3 w-3" />
            {user.mfaEnabled ? "MFA activo" : "MFA pendiente"}
          </span>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-brand-100/80 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3 w-3" />
            {loggingOut ? "Saliendo" : "Salir"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-brand-950 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-brand-950 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-1.5 text-brand-100 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-h-screen w-full flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/70 bg-[#f6f8f7]/85 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                EcoMarket Vital
              </p>
              <p className="text-sm font-semibold text-slate-800">Centro de operaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700 sm:inline">
              {user.rolLabel}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
              {initials}
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
