import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { googleAuthUrl, googleConfigured } from "@/lib/oauth";
import { generateToken, signValue } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?sso=unconfigured", req.url));
  }

  const state = signValue(generateToken(18));
  const store = await cookies();
  store.set("eco_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(googleAuthUrl(state));
}
