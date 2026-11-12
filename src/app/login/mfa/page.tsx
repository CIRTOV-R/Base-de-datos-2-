import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import MfaForm from "./mfa-form";

export default async function MfaPage() {
  const sesion = await getSession();
  if (!sesion) redirect("/login");
  if (sesion.mfaVerified) redirect("/dashboard");

  const credentials = await prisma.webAuthnCredential.count({
    where: { usuarioId: sesion.usuario.id },
  });

  return (
    <MfaForm
      nombre={sesion.usuario.nombre}
      email={sesion.usuario.email}
      hasTotp={sesion.usuario.mfaEnabled}
      hasWebauthn={credentials > 0}
    />
  );
}
