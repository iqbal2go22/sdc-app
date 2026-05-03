// Next.js 16 renamed `middleware.ts` to `proxy.ts`. The exported function is `proxy`.
// This file gates admin and supplier routes; unauthenticated visitors get redirected.

import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "sdc_session";

const PUBLIC_ROUTES = [
  "/", // landing
  "/login", // shared login form
  "/forgot-password",
  "/reset-password",
  "/start", // kickoff token redemption
];

const PUBLIC_PREFIXES = [
  "/_next/",
  "/api/auth/",
  "/api/health",
  "/favicon",
  "/robots",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through.
  if (PUBLIC_ROUTES.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;

  // Admin and supplier routes both require a session cookie. Role checks happen
  // in the actual route handlers / layouts via requireAdmin / requireSupplier.
  if (pathname.startsWith("/admin") || pathname.startsWith("/supplier")) {
    if (!sessionId) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\.).*)"], // skip static files
};
