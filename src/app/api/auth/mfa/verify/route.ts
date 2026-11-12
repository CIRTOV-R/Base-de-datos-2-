import { NextResponse } from "next/server";
import { getSession, markSessionVerified } from "@/lib/session";
import { checkLoginRateLimit, clearLoginAttempts, recordLoginAttempt } from "@/lib/rate-limit";
import { getClientIp, isJsonRequest, isSameOrigin } from "@/lib/security";
import { consumeRecoveryCode, verifyTotp } from "@/lib/totp";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req) || !isJsonRequest(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const sesion = await getSession();
  if (!sesion) {
    return NextResponse.json({ error: "Sesion expirada. Inicia sesion nuevamente." }, { status: 401 });
  }
  if (sesion.mfaVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const body = (await req.json().catch(() => ({}))) as { code?: string; recovery?: boolean };
  const code = String(body.code ?? "").trim();
  const recovery = Boolean(body.recovery);
  if (!code) {
    return NextResponse.json({ error: "Ingresa el codigo de verificacion." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rate = await checkLoginRateLimit(`mfa:${sesion.usuario.email}`, ip);
  if (rate.limited) {
    return NextResponse.json(
      { error: `Demasiados intentos. Espera ${rate.retryAfterMinutes} minutos.` },
      { status: 429 }
    );
  }

  const user = await prisma.usuario.findUnique({ where: { id: sesion.usuario.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 401 });
  }

  let valid = false;
  let remainingCodes = user.mfaRecoveryCodes;

  if (recovery) {
    const result = consumeRecoveryCode(user.mfaRecoveryCodes, code);
    valid = result.ok;
    remainingCodes = result.remaining;
  } else if (user.mfaEnabled && user.mfaSecret) {
    valid = verifyTotp(user.mfaSecret, code);
  }

  if (!valid) {
    await recordLoginAttempt(`mfa:${user.email}`, ip, false);
    await logAudit({
      usuarioId: user.id,
      email: user.email,
      accion: "mfa.fallido",
      detalle: recovery ? "Codigo de recuperacion invalido." : "Codigo TOTP invalido.",
      req,
      exito: false,
    });
    return NextResponse.json(
      { error: "Codigo invalido o expirado. Verifica la hora de tu dispositivo." },
      { status: 401 }
    );
  }

  if (recovery) {
    await prisma.usuario.update({
      where: { id: user.id },
      data: { mfaRecoveryCodes: remainingCodes },
    });
  }

  await clearLoginAttempts(`mfa:${user.email}`, ip);
  await markSessionVerified(sesion.id);
  await logAudit({
    usuarioId: user.id,
    email: user.email,
    accion: recovery ? "mfa.recuperacion_usada" : "mfa.exitoso",
    req,
  });

  return NextResponse.json({ ok: true, remainingRecoveryCodes: remainingCodes.length });
}
