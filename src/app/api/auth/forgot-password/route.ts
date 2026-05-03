import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateRawToken } from "@/lib/auth/tokens";
import { logEvent } from "@/lib/db/audit";
import { env } from "@/lib/env";

const Body = z.object({ email: z.string().email() });
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;

  const user = await prisma.user.findUnique({
    where: { email: parsed.email.toLowerCase() },
  });

  // Always respond identically to avoid email enumeration.
  if (!user || !user.active) {
    return NextResponse.json({ ok: true });
  }

  const token = generateRawToken();
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  await logEvent({
    eventType: "PASSWORD_RESET_REQUEST",
    actorUserId: user.id,
    vendorId: user.vendorId ?? null,
    ipAddress: ip,
  });

  // POC: surface the URL inline. Production would email it and never include it in the response.
  const devResetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  return NextResponse.json({ ok: true, devResetUrl });
}
