import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { registrationOptionsFor } from "@/lib/webauthn";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const sesion = await getSession();
  if (!sesion || !sesion.mfaVerified) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const options = await registrationOptionsFor(sesion.usuario);
    return NextResponse.json(options);
  } catch (error) {
    console.error("Error generando opciones WebAuthn", error);
    return NextResponse.json(
      { error: "No se pudieron generar las opciones de registro." },
      { status: 500 }
    );
  }
}
