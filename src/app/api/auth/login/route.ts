import { NextResponse } from "next/server";
import { verifyUserPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { checkLoginRateLimit, clearLoginAttempts, recordLoginAttempt } from "@/lib/rate-limit";
import { getClientIp, isJsonRequest, isSameOrigin, normalizeEmail } from "@/lib/security";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req) || !isJsonRequest(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "Correo y contrasena son obligatorios." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rate = await checkLoginRateLimit(email, ip);
  if (rate.limited) {
    await logAudit({
      email,
      accion: "login.bloqueado_rate_limit",
      detalle: "Demasiados intentos fallidos en la ventana de tiempo.",
      req,
      exito: false,
    });
    return NextResponse.json(
      {
        error: `Demasiados intentos fallidos. Espera ${rate.retryAfterMinutes} minutos antes de reintentar.`,
      },
      { status: 429 }
    );
  }

  const result = await verifyUserPassword(email, password);

  if (!result.ok) {
    await recordLoginAttempt(email, ip, false);
    await logAudit({
      usuarioId: result.user?.id,
      email,
      accion: "login.fallido",
      detalle: result.error,
      req,
      exito: false,
    });
    return NextResponse.json(
      { error: result.error, remaining: Math.max(0, rate.remaining - 1) },
      { status: 401 }
    );
  }

  const user = result.user;
  await clearLoginAttempts(email, ip);

  const webauthnCount = await prisma.webAuthnCredential.count({ where: { usuarioId: user.id } });
  const needsMfa = user.mfaEnabled || webauthnCount > 0;

  await createSession(user.id, { mfaVerified: !needsMfa, req });
  await recordLoginAttempt(email, ip, true);
  await logAudit({
    usuarioId: user.id,
    email,
    accion: needsMfa ? "login.mfa_pendiente" : "login.exitoso",
    detalle: needsMfa ? "Credenciales validas, pendiente segundo factor." : "Inicio de sesion completo.",
    req,
  });

  return NextResponse.json({
    ok: true,
    next: needsMfa ? "mfa" : "dashboard",
    methods: { totp: user.mfaEnabled, webauthn: webauthnCount > 0 },
  });
}
