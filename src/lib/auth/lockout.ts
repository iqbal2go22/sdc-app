import { prisma } from "@/lib/prisma";

const MAX_FAILS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export function isLocked(user: { lockedUntil: Date | null }): boolean {
  return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
}

export async function recordLoginFailure(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const newFails = user.failedAttempts + 1;
  const data: { failedAttempts: number; lockedUntil?: Date } = { failedAttempts: newFails };
  if (newFails >= MAX_FAILS) {
    data.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
    data.failedAttempts = 0;
  }
  await prisma.user.update({ where: { id: userId }, data });
}

export async function clearLockout(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}
