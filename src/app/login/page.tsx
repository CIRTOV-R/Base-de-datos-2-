import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { googleConfigured } from "@/lib/oauth";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await getSession();
  if (sesion?.mfaVerified) redirect("/dashboard");
  if (sesion && !sesion.mfaVerified) redirect("/login/mfa");

  const params = await searchParams;
  const ssoStatus = typeof params.sso === "string" ? params.sso : undefined;
  const nextPath = typeof params.next === "string" ? params.next : undefined;

  return <LoginForm googleEnabled={googleConfigured()} ssoStatus={ssoStatus} nextPath={nextPath} />;
}
