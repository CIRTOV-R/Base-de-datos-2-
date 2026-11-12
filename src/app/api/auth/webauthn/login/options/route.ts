import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { findActiveUser } from "@/lib/auth";
import { authenticationOptionsFor } from "@/lib/webauthn";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const sesion = await getSession();

  let usuarioId: string | null = null;

  if (sesion && !sesion.mfaVerified) {
    usuarioId = sesion.usuario.id;
  } else if (sesion && sesion.mfaVerified) {
    return NextResponse.json(
      { error: "La sesion ya esta verificada. No se requiere biometria." },
      { status: 400 }
    );
  } else if (body.email) {
    const user = await findActiveUser(body.email);
    usuarioId = user?.id ?? null;
  }

  if (!usuarioId) {
    return NextResponse.json(
      { error: "No se encontraron credenciales biometricas para esta cuenta." },
      { status: 400 }
    );
  }

  const options = await authenticationOptionsFor(usuarioId);
  if (!options) {
    return NextResponse.json(
      { error: "Esta cuenta no tiene biometria registrada. Usa tu contrasena y MFA." },
      { status: 400 }
    );
  }

  return NextResponse.json(options);
}
