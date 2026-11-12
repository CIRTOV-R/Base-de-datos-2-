import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { generateTotpSecret, totpUri } from "@/lib/totp";
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

  const user = await prisma.usuario.findUnique({ where: { id: sesion.usuario.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  if (user.mfaEnabled) {
    return NextResponse.json({ error: "MFA ya esta activo en esta cuenta." }, { status: 400 });
  }

  const secret = generateTotpSecret();
  await prisma.usuario.update({
    where: { id: user.id },
    data: { mfaSecret: secret, mfaEnabled: false },
  });

  const uri = totpUri(user.email, secret);
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 260 });

  return NextResponse.json({ secret, otpauth: uri, qr });
}
