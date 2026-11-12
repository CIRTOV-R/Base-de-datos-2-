import { NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getSession } from "@/lib/session";
import { verifyRegistration } from "@/lib/webauthn";
import { isJsonRequest, isSameOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSameOrigin(req) || !isJsonRequest(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const sesion = await getSession();
  if (!sesion || !sesion.mfaVerified) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    response?: RegistrationResponseJSON;
    deviceName?: string;
  };
  if (!body.response) {
    return NextResponse.json({ error: "Respuesta de registro requerida." }, { status: 400 });
  }

  try {
    const result = await verifyRegistration(sesion.usuario.id, body.response, body.deviceName);
    if (!result.verified) {
      return NextResponse.json({ error: result.error || "Registro no verificado." }, { status: 400 });
    }

    await logAudit({
      usuarioId: sesion.usuario.id,
      email: sesion.usuario.email,
      accion: "webauthn.registrado",
      detalle: body.deviceName || "Nueva credencial biometrica registrada.",
      req,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error verificando registro WebAuthn", error);
    return NextResponse.json(
      { error: "No se pudo completar el registro biometrico." },
      { status: 400 }
    );
  }
}
