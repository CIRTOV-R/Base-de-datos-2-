import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode } from "@/lib/oauth";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { constantEqual, normalizeEmail, verifySignedValue } from "@/lib/security";
import { logAudit } from "@/lib/audit";
import { Rol } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const cookieState = store.get("eco_oauth_state")?.value;
  store.delete("eco_oauth_state");

  if (
    !code ||
    !state ||
    !cookieState ||
    !constantEqual(state, cookieState) ||
    !verifySignedValue(state)
  ) {
    return NextResponse.redirect(new URL("/login?sso=error", req.url));
  }

  const profile = await exchangeGoogleCode(code);
  if (!profile || !profile.email || !profile.email_verified) {
    await logAudit({
      email: profile?.email ?? null,
      accion: "sso.fallido",
      detalle: "No se pudo validar el perfil de Google.",
      req,
      exito: false,
    });
    return NextResponse.redirect(new URL("/login?sso=error", req.url));
  }

  const email = normalizeEmail(profile.email);
  let user = await prisma.usuario.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.usuario.create({
      data: {
        nombre: profile.name || email.split("@")[0],
        email,
        rol: Rol.ANALISTA,
        provider: "google",
        emailVerified: new Date(),
        passwordHash: null,
      },
    });
  } else if (!user.activo) {
    await logAudit({
      usuarioId: user.id,
      email,
      accion: "sso.cuenta_inactiva",
      detalle: "Intento de SSO con una cuenta desactivada.",
      req,
      exito: false,
    });
    return NextResponse.redirect(new URL("/login?sso=error", req.url));
  } else if (user.provider === "google" && !user.emailVerified) {
    await prisma.usuario.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  }

  await createSession(user.id, { mfaVerified: true, req });
  await logAudit({
    usuarioId: user.id,
    email,
    accion: "login.sso",
    detalle: "Inicio de sesion mediante Google SSO.",
    req,
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
