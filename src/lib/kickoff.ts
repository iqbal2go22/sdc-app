// Kickoff token logic per D13: app generates per-contact tokens, exposes them via CSV.
// Tokens are reused if still active/unused, so re-downloading the CSV doesn't invalidate live links.

import { prisma } from "@/lib/prisma";
import { generateRawToken } from "./auth/tokens";

const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days per D4

export async function ensureKickoffTokenForUser(userId: string): Promise<string> {
  const existing = await prisma.kickoffToken.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing.token;
  return regenerateKickoffTokenForUser(userId);
}

export async function regenerateKickoffTokenForUser(userId: string): Promise<string> {
  const token = generateRawToken();
  await prisma.kickoffToken.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return token;
}
