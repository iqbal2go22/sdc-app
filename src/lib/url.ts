import type { NextRequest } from "next/server";

/**
 * When the app is behind a proxy (Replit's edge, Vercel's edge, etc.),
 * `request.url` and the `Host` header may reflect the internal bind address
 * rather than the public hostname. This helper assembles the canonical public
 * origin from forwarded headers, falling back to the Host header and finally
 * to localhost.
 */
export function publicOrigin(request: NextRequest): string {
  const fwdHost = request.headers.get("x-forwarded-host");
  const fwdProto = request.headers.get("x-forwarded-proto");
  const host = fwdHost ?? request.headers.get("host") ?? "localhost:3000";
  const proto = fwdProto ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function publicUrl(request: NextRequest, path: string): string {
  return new URL(path, publicOrigin(request)).toString();
}
