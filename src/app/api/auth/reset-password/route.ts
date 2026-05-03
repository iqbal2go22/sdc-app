import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordPolicyError } from "@/lib/auth/password";
import { logEvent } from "@/lib/db/audit";

const Body = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const policyErr = passwordPolicyError(parsed.password);
  if (policyErr) return NextResponse.json({ error: policyErr }, { status: 400 });

  const row = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.token },
    include: { user: true },
  });

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now() || !row.user.active) {
    return NextResponse.json(
      { error: "Reset link is invalid or expired." },
      { status: 400 },
    );
  }

  const hash = await hashPassword(parsed.password);

  await prisma.$transaction([
    prisma.passwordCredential.upsert({
      where: { userId: row.userId },
      update: { passwordHash: hash, lastChangedAt: new Date() },
      create: { userId: row.userId, passwordHash: hash },
    }),
    prisma.passwordResetToken.update({
      where: { token: parsed.token },
      data: { usedAt: new Date() },
    }),
    // Invalidate any active sessions (forces re-login with new password).
    prisma.session.deleteMany({ where: { userId: row.userId } }),
    // Reset lockout state.
    prisma.user.update({
      where: { id: row.userId },
      data: { failedAttempts: 0, lockedUntil: null },
    }),
  ]);

  await logEvent({
    eventType: "PASSWORD_RESET_COMPLETE",
    actorUserId: row.userId,
    vendorId: row.user.vendorId ?? null,
  });

  return NextResponse.json({ ok: true });
}
