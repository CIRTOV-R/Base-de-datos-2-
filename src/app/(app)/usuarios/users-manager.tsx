"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Unlock,
  UserPlus,
  X,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  mfaEnabled: boolean;
  provider: string;
  lastLogin: string | null;
  lockedUntil: string | null;
  createdAt: string;
};

const ROLES: Array<{ value: string; label: string }> = [
  { value: "ADMIN", label: "Administrador" },
  { value: "GERENTE", label: "Gerente" },
  { value: "ANALISTA", label: "Analista" },
  { value: "VENDEDOR", label: "Vendedor" },
  { value: "AUDITOR", label: "Auditor" },
];

type Notice = { type: "ok" | "error"; text: string } | null;

export default function UsersManager({
  usuarios,
  currentUserId,
}: {
  usuarios: Usuario[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    rol: "ANALISTA",
    password: "",
  });
  const [creating, setCreating] = useState(false);

  const [resetTarget, setResetTarget] = useState<Usuario | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetNotice, setResetNotice] = useState<Notice>(null);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ type: "error", text: data.error || "No se pudo crear el usuario." });
        return;
      }
      setForm({ nombre: "", email: "", rol: "ANALISTA", password: "" });
      setNotice({ type: "ok", text: "Usuario creado correctamente." });
      router.refresh();
    } catch {
      setNotice({ type: "error", text: "Error de conexion." });
    } finally {
      setCreating(false);
    }
  }

  async function patchUser(id: string, payload: Record<string, unknown>, successText: string) {
    setBusyId(id);
    setNotice(null);
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ type: "error", text: data.error || "No se pudo actualizar el usuario." });
        return;
      }
      setNotice({ type: "ok", text: successText });
      router.refresh();
    } catch {
      setNotice({ type: "error", text: "Error de conexion." });
    } finally {
      setBusyId(null);
    }
  }

  async function submitReset(event: React.FormEvent) {
    event.preventDefault();
    if (!resetTarget) return;
    setResetBusy(true);
    setResetNotice(null);
    try {
      const res = await fetch(`/api/usuarios/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetNotice({ type: "error", text: data.error || "No se pudo restablecer la contrasena." });
        return;
      }
      setResetTarget(null);
      setResetPassword("");
      setNotice({
        type: "ok",
        text: "Contrasena restablecida. Se revocaron las sesiones del usuario.",
      });
      router.refresh();
    } catch {
      setResetNotice({ type: "error", text: "Error de conexion." });
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
            Administracion
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Usuarios y roles</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Gestiona el acceso al sistema aplicando RBAC y el principio de menor privilegio. Solo
            el rol Administrador puede acceder a esta seccion.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800">
          <ShieldCheck className="h-4 w-4" />
          RBAC activo
        </span>
      </div>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-800">Crear usuario</h2>
          </div>
          <form onSubmit={createUser} className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Nombre completo</span>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Laura Mendez"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Correo</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="laura@ecomarket.cr"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Rol</span>
              <select
                value={form.rol}
                onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">
                Contrasena temporal
              </span>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 10, mayuscula, numero y simbolo"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Crear usuario
            </button>
          </form>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-400">
            Politica de contrasena: minimo 10 caracteres, una mayuscula, una minuscula, un numero y
            un caracter especial. El nuevo usuario debe cambiar la contrasena en su primer ingreso.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Usuarios del sistema ({usuarios.length})
            </h2>
            <span className="text-[11px] text-slate-400">Principio de menor privilegio</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>MFA</th>
                  <th>Ultimo ingreso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                            {u.nombre
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">
                              {u.nombre}
                              {isSelf && (
                                <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold text-brand-700">
                                  TU
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          value={u.rol}
                          disabled={busy || isSelf}
                          onChange={(e) =>
                            patchUser(u.id, { rol: e.target.value }, "Rol actualizado.")
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-brand-500 disabled:opacity-60"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={busy || isSelf}
                          onClick={() =>
                            patchUser(
                              u.id,
                              { activo: !u.activo },
                              u.activo ? "Usuario desactivado." : "Usuario activado."
                            )
                          }
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold disabled:opacity-60 ${
                            u.activo
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {u.activo ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          {u.activo ? "Activo" : "Inactivo"}
                        </button>
                        {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
                            <Lock className="h-2.5 w-2.5" />
                            Bloqueado
                          </p>
                        )}
                      </td>
                      <td>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            u.mfaEnabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {u.mfaEnabled ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="text-[11px] text-slate-500">
                        {u.lastLogin ? formatDateTime(u.lastLogin) : "Nunca"}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {u.lockedUntil && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                patchUser(u.id, { unlock: true }, "Usuario desbloqueado.")
                              }
                              className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 disabled:opacity-60"
                              title="Desbloquear"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(u);
                              setResetPassword("");
                              setResetNotice(null);
                            }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                            title="Restablecer contrasena"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Restablecer contrasena</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {resetTarget.nombre} · {resetTarget.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {resetNotice && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {resetNotice.text}
              </div>
            )}

            <form onSubmit={submitReset} className="mt-4 space-y-3">
              <input
                required
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Nueva contrasena temporal"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <p className="text-[10px] text-slate-400">
                Minimo 10 caracteres, mayuscula, minuscula, numero y simbolo. Se revocaran todas las
                sesiones del usuario.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {resetBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                  Restablecer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
