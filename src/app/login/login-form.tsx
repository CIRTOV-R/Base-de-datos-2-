"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  googleEnabled: boolean;
  ssoStatus?: string;
  nextPath?: string;
};

const DEMO_USERS = [
  { email: "admin@ecomarket.cr", rol: "Administrador" },
  { email: "gerente@ecomarket.cr", rol: "Gerente" },
  { email: "analista@ecomarket.cr", rol: "Analista" },
  { email: "vendedor@ecomarket.cr", rol: "Vendedor" },
  { email: "auditor@ecomarket.cr", rol: "Auditor (MFA)" },
];

export default function LoginForm({ googleEnabled, ssoStatus, nextPath }: Props) {
  const router = useRouter();
  const safeNext = nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo iniciar sesion.");
        return;
      }
      if (data.next === "mfa") {
        router.push("/login/mfa");
        router.refresh();
        return;
      }
      router.push(safeNext);
      router.refresh();
    } catch {
      setError("Error de conexion. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    setError(null);
    if (!email.trim()) {
      setError("Escribe tu correo para usar la llave de acceso o biometria.");
      return;
    }
    setBioLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/webauthn/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(options.error || "No hay credenciales biométricas registradas.");
        return;
      }
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const response = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/webauthn/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, response }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(data.error || "No se pudo verificar la biometria.");
        return;
      }
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Operacion cancelada.";
      setError(message);
    } finally {
      setBioLoading(false);
    }
  }

  function useDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("EcoMarket#2026");
    setShowDemo(false);
    setError(null);
  }

  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-950 via-brand-800 to-emerald-600 p-12 text-white lg:flex">
        <div className="eco-grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <LeafIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight">EcoMarket Vital</p>
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">
                Gestion ecologica
              </p>
            </div>
          </div>

          <h1 className="mt-16 max-w-md text-4xl font-semibold leading-tight">
            Decisiones inteligentes para un supermercado sostenible.
          </h1>
          <p className="mt-4 max-w-md text-emerald-100/90">
            Analitica SQL en tiempo real, control de acceso por roles y seguridad de nivel
            empresarial en una sola plataforma.
          </p>

          <div className="mt-10 grid max-w-md gap-3 text-sm">
            {[
              "Autenticacion multifactor (TOTP)",
              "Biometria y llaves de acceso WebAuthn",
              "Single Sign-On con Google",
              "RBAC y principio de menor privilegio",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-emerald-50">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-6 text-xs text-emerald-100/80">
          <span>PostgreSQL + Prisma</span>
          <span className="h-1 w-1 rounded-full bg-emerald-200/60" />
          <span>Next.js 15</span>
          <span className="h-1 w-1 rounded-full bg-emerald-200/60" />
          <span>10 consultas analiticas</span>
        </div>
      </aside>

      <main className="flex w-full items-center justify-center px-5 py-10 lg:w-1/2">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <LeafIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-semibold text-slate-900">EcoMarket Vital</p>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Gestion ecologica</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900">Iniciar sesion</h2>
          <p className="mt-1 text-sm text-slate-500">
            Accede con tus credenciales corporativas. Los administradores pueden tener MFA activo.
          </p>

          {ssoStatus === "unconfigured" && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              El SSO con Google no esta configurado en este entorno (faltan variables de entorno).
            </div>
          )}
          {ssoStatus === "error" && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              No se pudo completar el inicio de sesion con Google. Intenta nuevamente.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Correo electronico</span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.nombre@ecomarket.cr"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Contrasena</span>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-20 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                >
                  {showPassword ? "Ocultar" : "Ver"}
                </button>
              </div>
            </label>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Verificando..." : "Entrar al sistema"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            o continua con
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid gap-3">
            <a
              href={googleEnabled ? "/api/auth/sso/google" : "/login?sso=unconfigured"}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <GoogleIcon className="h-4 w-4" />
              Single Sign-On con Google
            </a>
            <button
              type="button"
              onClick={handleBiometric}
              disabled={bioLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800 transition hover:bg-brand-100 disabled:opacity-60"
            >
              <FingerprintIcon className="h-4 w-4" />
              {bioLoading ? "Esperando biometria..." : "Acceder con biometria / passkey"}
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setShowDemo((v) => !v)}
              className="flex w-full items-center justify-between font-medium text-slate-600"
            >
              <span>Credenciales de demostracion</span>
              <span>{showDemo ? "Ocultar" : "Mostrar"}</span>
            </button>
            {showDemo && (
              <div className="mt-3 space-y-1.5">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => useDemo(u.email)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-slate-100"
                  >
                    <span className="font-mono text-[11px] text-slate-700">{u.email}</span>
                    <span className="text-[11px] text-slate-400">{u.rol}</span>
                  </button>
                ))}
                <p className="pt-1 text-[11px] text-slate-400">
                  Contrasena para todas las cuentas: <span className="font-mono">EcoMarket#2026</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M20 4c-8.5 0-14 4.2-14 10a6 6 0 0 0 6 6c5.8 0 8-5.5 8-16Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20c1.5-4.5 4.5-7.5 9-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.6l4-2.9Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
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
