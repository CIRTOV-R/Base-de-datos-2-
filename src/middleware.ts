import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/consultas", "/seguridad", "/usuarios", "/auditoria"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get("eco_session")?.value);

  if (!hasSession && PROTECTED.some((path) => pathname.startsWith(path))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/consultas/:path*",
    "/seguridad/:path*",
    "/usuarios/:path*",
    "/auditoria/:path*",
  ],
};
