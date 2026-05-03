import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  // OWASP recommended params for Argon2id (2024)
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    return await verify(stored, plain, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}

const COMMON_BREACHED = new Set([
  "password",
  "12345678",
  "qwerty12",
  "123456789",
  "abc123456",
  "password1",
  "letmein1",
  "welcome1",
  "iloveyou",
  "admin123",
]);

export function passwordPolicyError(plain: string): string | null {
  if (plain.length < 8) return "Password must be at least 8 characters.";
  if (COMMON_BREACHED.has(plain.toLowerCase()))
    return "This password is on a known-breach list. Choose a less common one.";
  return null;
}
