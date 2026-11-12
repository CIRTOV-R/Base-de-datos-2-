"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Fingerprint,
  KeyRound,
  Laptop,
  Lock,
  Monitor,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";

type Props = {
  user: {
    nombre: string;
    email: string;
    rol: string;
    provider: string;
    mfaEnabled: boolean;
    lastLogin: string | null;
    createdAt: string;
    hasPassword: boolean;
  };
  credentials: Array<{
    id: string;
    deviceType: string | null;
    backedUp: boolean;
    transports: string | null;
    createdAt: string;
  }>;
  sessions: Array<{
    id: string;
    createdAt: string;
    expiresAt: string;
    ip: string | null;
    userAgent: string | null;
  }>;
  currentSessionId: string;
};

type Notice = { type: "ok" | "error"; text: string } | null;

type MfaSetup = { secret: string; otpauth: string; qr: string };

export default function SecurityPanel({
  user,
  credentials,
  sessions,
  currentSessionId,
}: Props) {
  const router = useRouter();

  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [mfaNotice, setMfaNotice] = useState<Notice>(null);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const [deviceName, setDeviceName] = useState("");
  const [bioNotice, setBioNotice] = useState<Notice>(null);
  const [bioBusy, setBioBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passNotice, setPassNotice] = useState<Notice>(null);
  const [passBusy, setPassBusy] = useState(false);

  const [sessionNotice, setSessionNotice] = useState<Notice>(null);

  async function startMfaSetup() {
    setMfaBusy(true);
    setMfaNotice(null);
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMfaNotice({ type: "error", text: data.error || "No se pudo iniciar la configuracion." });
        return;
      }
      setSetup(data);
    } catch {
      setMfaNotice({ type: "error", text: "Error de conexion." });
    } finally {
      setMfaBusy(false);
    }
  }

  async function enableMfa(event: React.FormEvent) {
    event.preventDefault();
    setMfaBusy(true);
    setMfaNotice(null);
    try {
      const res = await fetch("/api/auth/mfa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: setupCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMfaNotice({ type: "error", text: data.error || "No se pudo activar MFA." });
        return;
      }
      setRecoveryCodes(data.recoveryCodes);
      setSetup(null);
      setSetupCode("");
      setMfaNotice({ type: "ok", text: "MFA activado correctamente." });
      router.refresh();
    } catch {
      setMfaNotice({ type: "error", text: "Error de conexion." });
    } finally {
      setMfaBusy(false);
    }
  }

  async function disableMfa(event: React.FormEvent) {
    event.preventDefault();
    setMfaBusy(true);
    setMfaNotice(null);
    try {
      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMfaNotice({ type: "error", text: data.error || "No se pudo desactivar MFA." });
        return;
      }
      setShowDisable(false);
      setDisablePassword("");
      setDisableCode("");
      setRecoveryCodes(null);
      setMfaNotice({ type: "ok", text: "MFA desactivado. Te recomendamos mantenerlo activo." });
      router.refresh();
    } catch {
      setMfaNotice({ type: "error", text: "Error de conexion." });
    } finally {
      setMfaBusy(false);
    }
  }

  async function registerBiometric() {
    setBioBusy(true);
    setBioNotice(null);
    try {
      const optionsRes = await fetch("/api/auth/webauthn/register/options", { method: "POST" });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        setBioNotice({ type: "error", text: options.error || "No se pudieron generar las opciones." });
        return;
      }
      const { startRegistration } = await import("@simplewebauthn/browser");
      const response = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, deviceName: deviceName || undefined }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) {
        setBioNotice({ type: "error", text: data.error || "No se pudo registrar la biometria." });
        return;
      }
      setDeviceName("");
      setBioNotice({ type: "ok", text: "Credencial biometrica registrada correctamente." });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operacion cancelada.";
      setBioNotice({ type: "error", text: message });
    } finally {
      setBioBusy(false);
    }
  }

  async function deleteCredential(id: string) {
    setBioNotice(null);
    try {
      const res = await fetch(`/api/auth/webauthn/credentials/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setBioNotice({ type: "error", text: data.error || "No se pudo eliminar la credencial." });
        return;
      }
      setBioNotice({ type: "ok", text: "Credencial eliminada." });
      router.refresh();
    } catch {
      setBioNotice({ type: "error", text: "Error de conexion." });
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setPassBusy(true);
    setPassNotice(null);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassNotice({ type: "error", text: data.error || "No se pudo cambiar la contrasena." });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPassNotice({
        type: "ok",
        text: "Contrasena actualizada. Se cerraron las demas sesiones activas.",
      });
    } catch {
      setPassNotice({ type: "error", text: "Error de conexion." });
    } finally {
      setPassBusy(false);
    }
  }

  async function revokeSession(id: string) {
    setSessionNotice(null);
    try {
      const res = await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setSessionNotice({ type: "error", text: data.error || "No se pudo revocar la sesion." });
        return;
      }
      if (data.current) {
        router.push("/login");
        router.refresh();
        return;
      }
      setSessionNotice({ type: "ok", text: "Sesion revocada." });
      router.refresh();
    } catch {
      setSessionNotice({ type: "error", text: "Error de conexion." });
    }
  }

  async function revokeOthers() {
    setSessionNotice(null);
    try {
      const res = await fetch("/api/auth/sessions", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setSessionNotice({ type: "error", text: data.error || "No se pudieron revocar las sesiones." });
        return;
      }
      setSessionNotice({ type: "ok", text: "Se cerraron las demas sesiones." });
      router.refresh();
    } catch {
      setSessionNotice({ type: "error", text: "Error de conexion." });
    }
  }

  function downloadRecoveryCodes() {
    if (!recoveryCodes) return;
    const blob = new Blob(
      [
        `EcoMarket Vital - Codigos de recuperacion MFA\nCuenta: ${user.email}\n\n${recoveryCodes.join(
          "\n"
        )}\n\nGuarda estos codigos en un lugar seguro. Cada codigo se usa una sola vez.\n`,
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ecomarket-codigos-recuperacion.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copySecret() {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-600">Seguridad</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Centro de seguridad</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Administra autenticacion multifactor, biometria, contrasena y sesiones activas. Aplica el
          principio de menor privilegio en cada accion.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{user.nombre}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-400">Rol</dt>
              <dd className="font-medium text-slate-700">{user.rol}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Proveedor</dt>
              <dd className="font-medium capitalize text-slate-700">{user.provider}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">MFA</dt>
              <dd
                className={`font-semibold ${user.mfaEnabled ? "text-emerald-600" : "text-amber-600"}`}
              >
                {user.mfaEnabled ? "Activo" : "Pendiente"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Ultimo ingreso</dt>
              <dd className="font-medium text-slate-700">
                {user.lastLogin ? formatDateTime(user.lastLogin) : "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
            La cuenta se creo el {formatDateTime(user.createdAt)}. Las sesiones expiran
            automaticamente a las 8 horas.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Autenticacion multifactor (TOTP)
                </h2>
                <p className="text-xs text-slate-400">
                  Segundo factor con Google Authenticator, Authy o 1Password.
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                user.mfaEnabled
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {user.mfaEnabled ? "Activo" : "Inactivo"}
            </span>
          </div>

          {mfaNotice && <NoticeBox notice={mfaNotice} />}

          {user.mfaEnabled ? (
            <div className="mt-4">
              <p className="text-sm text-slate-600">
                Tu cuenta esta protegida con un codigo temporal de 6 digitos. Se solicita en cada
                inicio de sesion.
              </p>
              {!showDisable ? (
                <button
                  type="button"
                  onClick={() => setShowDisable(true)}
                  className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Desactivar MFA
                </button>
              ) : (
                <form onSubmit={disableMfa} className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Confirma con tu contrasena y un codigo MFA vigente para desactivar la
                    proteccion.
                  </p>
                  {user.hasPassword && (
                    <input
                      type="password"
                      required
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Contrasena actual"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                  )}
                  <input
                    required
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    placeholder="Codigo de 6 digitos"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={mfaBusy}
                      className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      Confirmar desactivacion
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDisable(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : setup ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setup.qr}
                  alt="Codigo QR para configurar TOTP"
                  className="h-40 w-40 rounded-xl border border-slate-200 bg-white p-2"
                />
                <button
                  type="button"
                  onClick={copySecret}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-brand-700"
                >
                  <Copy className="h-3 w-3" />
                  Copiar clave
                </button>
              </div>
              <div>
                <ol className="space-y-1.5 text-xs text-slate-600">
                  <li>1. Escanea el codigo QR con tu aplicacion autenticadora.</li>
                  <li>
                    2. Si no puedes escanear, ingresa esta clave:{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                      {setup.secret}
                    </code>
                  </li>
                  <li>3. Escribe el codigo de 6 digitos que muestra la app.</li>
                </ol>
                <form onSubmit={enableMfa} className="mt-3 flex flex-wrap gap-2">
                  <input
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-semibold tracking-[0.3em] outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={mfaBusy || setupCode.length < 6}
                    className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    Activar MFA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSetup(null);
                      setSetupCode("");
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                  >
                    Cancelar
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-slate-600">
                Anade una capa adicional de seguridad. Al activarlo, se solicitara un codigo
                temporal despues de tu contrasena.
              </p>
              <button
                type="button"
                onClick={startMfaSetup}
                disabled={mfaBusy}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Configurar autenticador
              </button>
            </div>
          )}

          {recoveryCodes && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Guarda estos codigos de recuperacion (se muestran una sola vez)
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-xs text-amber-900">
                {recoveryCodes.map((code) => (
                  <span key={code} className="rounded bg-white/70 px-2 py-1">
                    {code}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={downloadRecoveryCodes}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700"
              >
                <Download className="h-3 w-3" />
                Descargar codigos
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Fingerprint className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Biometria y passkeys</h2>
              <p className="text-xs text-slate-400">WebAuthn con huella, rostro o llave fisica.</p>
            </div>
          </div>

          {bioNotice && <NoticeBox notice={bioNotice} />}

          <div className="mt-4 space-y-2">
            {credentials.length === 0 && (
              <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
                No hay credenciales biometricas registradas.
              </p>
            )}
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Laptop className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-700">
                      {credential.deviceType || "Dispositivo biometrico"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatDateTime(credential.createdAt)}
                      {credential.backedUp ? " · sincronizada" : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteCredential(credential.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Eliminar credencial"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="min-w-[180px] flex-1">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">
                Nombre del dispositivo
              </span>
              <input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Ej. Laptop de trabajo"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <button
              type="button"
              onClick={registerBiometric}
              disabled={bioBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <Fingerprint className="h-3.5 w-3.5" />
              {bioBusy ? "Registrando..." : "Registrar biometria"}
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
            Requiere un dispositivo compatible y un contexto seguro (HTTPS o localhost). Al
            registrarla, podras iniciar sesion sin contrasena desde el login.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Contrasena</h2>
              <p className="text-xs text-slate-400">Politica: 10+ caracteres, mayuscula, numero y simbolo.</p>
            </div>
          </div>

          {passNotice && <NoticeBox notice={passNotice} />}

          {user.hasPassword ? (
            <form onSubmit={changePassword} className="mt-4 space-y-2.5">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Contrasena actual"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <input
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contrasena"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nueva contrasena"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={passBusy}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {passBusy ? "Actualizando..." : "Cambiar contrasena"}
              </button>
            </form>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
              Tu cuenta usa Google SSO. La contrasena se gestiona desde tu proveedor de identidad.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Monitor className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Sesiones activas</h2>
              <p className="text-xs text-slate-400">
                {sessions.length} sesion(es) vigente(s) para esta cuenta.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={revokeOthers}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cerrar las demas sesiones
          </button>
        </div>

        {sessionNotice && <NoticeBox notice={sessionNotice} />}

        <div className="mt-4 divide-y divide-slate-100">
          {sessions.map((session) => (
            <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  {session.id === currentSessionId ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Monitor className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  {session.id === currentSessionId ? "Sesion actual" : "Sesion remota"}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    {session.ip || "IP desconocida"}
                  </span>
                </p>
                <p className="mt-0.5 max-w-xl truncate text-[10px] text-slate-400">
                  {session.userAgent || "Agente desconocido"}
                </p>
                <p className="text-[10px] text-slate-400">
                  Inicio {formatDateTime(session.createdAt)} · expira {formatDateTime(session.expiresAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revokeSession(session.id)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                Revocar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NoticeBox({ notice }: { notice: NonNullable<Notice> }) {
  return (
    <div
      className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
        notice.type === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {notice.text}
    </div>
  );
}
