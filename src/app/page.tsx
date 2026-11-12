import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const sesion = await getSession();
  if (!sesion) redirect("/login");
  if (!sesion.mfaVerified) redirect("/login/mfa");
  redirect("/dashboard");
}
