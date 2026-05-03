import { randomBytes } from "node:crypto";

// URL-safe random tokens for kickoff links, password resets, and sessions.
// POC stores tokens raw in the DB; production should fingerprint via sha256
// so DB compromise doesn't leak active tokens (tracked in tech debt).
export function generateRawToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}
