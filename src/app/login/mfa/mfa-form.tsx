"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  nombre: string;
  email: string;
  hasTotp: boolean;
  hasWebauthn: boolean;
};

export default function MfaForm({ nombre, email, hasTotp, hasWebauthn }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, recovery: useRecovery }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Codigo invalido.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de conexion. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    setError(null);
    setBioLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/webauthn/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(options.error || "No hay credenciales biometricas disponibles.");
        return;
      }
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const response = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/webauthn/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(data.error || "No se pudo verificar la biometria.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operacion cancelada.");
    } finally {
      setBioLoading(false);
    }
  }

  async function cancelar() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-emerald-800 px-5 py-10">
      <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <ShieldIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Verificacion</p>
            <h1 className="text-xl font-semibold text-slate-900">Segundo factor requerido</h1>
          </div>
        </div>

        <p className="mt-5 text-sm text-slate-600">
          Hola <span className="font-semibold text-slate-900">{nombre}</span>. La cuenta{" "}
          <span className="font-mono text-xs">{email}</span> tiene proteccion adicional. Confirma tu
          identidad para continuar.
        </p>

        {hasTotp && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                {useRecovery ? "Codigo de recuperacion" : "Codigo de la app autenticadora"}
              </span>
              <input
                autoFocus
                value={code}
                onChange={(e) => setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""))}
                inputMode={useRecovery ? "text" : "numeric"}
                maxLength={useRecovery ? 20 : 6}
                placeholder={useRecovery ? "XXXXX-XXXXX" : "000000"}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Verificar y entrar"}
            </button>

            <button
              type="button"
              onClick={() => {
                setUseRecovery((v) => !v);
                setCode("");
                setError(null);
              }}
              className="w-full text-center text-xs font-medium text-slate-500 hover:text-brand-700"
            >
              {useRecovery
                ? "Usar codigo de la app autenticadora"
                : "Usar un codigo de recuperacion"}
            </button>
          </form>
        )}

        {!hasTotp && !hasWebauthn && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No hay metodos de segundo factor configurados. Vuelve a iniciar sesion o contacta al
            administrador.
          </div>
        )}

        {hasWebauthn && (
          <div className="mt-5">
            <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              o
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <button
              type="button"
              onClick={handleBiometric}
              disabled={bioLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800 transition hover:bg-brand-100 disabled:opacity-60"
            >
              <FingerprintIcon className="h-4 w-4" />
              {bioLoading ? "Esperando biometria..." : "Verificar con biometria / passkey"}
            </button>
          </div>
        )}

        {error && !hasTotp && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={cancelar}
          className="mt-6 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          Cancelar e iniciar sesion con otra cuenta
        </button>
      </div>
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FingerprintIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M12 11a3 3 0 0 0-3 3c0 2.5-.5 4.5-1.5 6" strokeLinecap="round" />
      <path d="M15 14c0 2-.3 3.8-1 5.5" strokeLinecap="round" />
      <path d="M8.2 5.3A7 7 0 0 1 19 11c0 1.6-.1 3-.4 4.5" strokeLinecap="round" />
      <path d="M5 8a7 7 0 0 0-.9 5c0 1.8-.2 3.3-.7 4.7" strokeLinecap="round" />
      <path d="M12 8a6 6 0 0 0-6 6" strokeLinecap="round" />
    </svg>
  );
}
