import { NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { createSession, getSession, markSessionVerified } from "@/lib/session";
import { findActiveUser } from "@/lib/auth";
import { verifyAuthentication } from "@/lib/webauthn";
import { getClientIp, isJsonRequest, isSameOrigin } from "@/lib/security";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req) || !isJsonRequest(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    response?: AuthenticationResponseJSON;
    email?: string;
  };
  if (!body.response) {
    return NextResponse.json({ error: "Respuesta biometrica requerida." }, { status: 400 });
  }

  const sesion = await getSession();
  let usuarioId: string | null = null;
  let email: string | null = null;

  if (sesion && !sesion.mfaVerified) {
    usuarioId = sesion.usuario.id;
    email = sesion.usuario.email;
  } else if (sesion && sesion.mfaVerified) {
    return NextResponse.json({ error: "La sesion ya esta verificada." }, { status: 400 });
  } else if (body.email) {
    const user = await findActiveUser(body.email);
    usuarioId = user?.id ?? null;
    email = user?.email ?? null;
  }

  if (!usuarioId || !email) {
    return NextResponse.json(
      { error: "No se pudo identificar la cuenta para la verificacion biometrica." },
      { status: 401 }
    );
  }

  const ip = getClientIp(req);
  const rate = await checkLoginRateLimit(`webauthn:${email}`, ip);
  if (rate.limited) {
    return NextResponse.json(
      { error: `Demasiados intentos. Espera ${rate.retryAfterMinutes} minutos.` },
      { status: 429 }
    );
  }

  try {
    const result = await verifyAuthentication(usuarioId, body.response);
    if (!result.verified) {
      await recordLoginAttempt(`webauthn:${email}`, ip, false);
      await logAudit({
        usuarioId,
        email,
        accion: "webauthn.fallido",
        detalle: result.error,
        req,
        exito: false,
      });
      return NextResponse.json(
        { error: "No se pudo verificar la biometria. Intenta nuevamente." },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error verificando WebAuthn", error);
    return NextResponse.json(
      { error: "No se pudo verificar la credencial biometrica." },
      { status: 400 }
    );
  }

  if (sesion && !sesion.mfaVerified) {
    await markSessionVerified(sesion.id);
  } else {
    await createSession(usuarioId, { mfaVerified: true, req });
  }

  await recordLoginAttempt(`webauthn:${email}`, ip, true);
  await logAudit({
    usuarioId,
    email,
    accion: "webauthn.exitoso",
    detalle: "Inicio de sesion con biometria / passkey.",
    req,
  });

  return NextResponse.json({ ok: true, next: "dashboard" });
}
