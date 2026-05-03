import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { isLocked, recordLoginFailure, clearLockout } from "@/lib/auth/lockout";
import { logEvent } from "@/lib/db/audit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  let parsed;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, password } = parsed;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { credential: true },
  });

  // Generic message regardless of cause to avoid email-enumeration leak.
  const GENERIC_FAIL = "Email or password is incorrect.";

  if (!user || !user.active || !user.credential) {
    await logEvent({ eventType: "LOGIN_FAILURE", ipAddress: ip, eventData: { email } });
    return NextResponse.json({ error: GENERIC_FAIL }, { status: 401 });
  }

  if (isLocked(user)) {
    await logEvent({
      eventType: "LOGIN_FAILURE",
      actorUserId: user.id,
      ipAddress: ip,
      eventData: { reason: "locked" },
    });
    return NextResponse.json(
      { error: "Account is temporarily locked. Try again later." },
      { status: 423 },
    );
  }

  const ok = await verifyPassword(password, user.credential.passwordHash);
  if (!ok) {
    await recordLoginFailure(user.id);
    await logEvent({
      eventType: "LOGIN_FAILURE",
      actorUserId: user.id,
      ipAddress: ip,
    });
    return NextResponse.json({ error: GENERIC_FAIL }, { status: 401 });
  }

  await clearLockout(user.id);
  await createSession(user.id, ip ?? undefined, userAgent ?? undefined);
  await logEvent({
    eventType: user.role === "ADMIN" ? "ADMIN_LOGIN" : "LOGIN_SUCCESS",
    actorUserId: user.id,
    vendorId: user.vendorId ?? null,
    ipAddress: ip,
  });
  await logEvent({
    eventType: "SESSION_START",
    actorUserId: user.id,
    vendorId: user.vendorId ?? null,
    ipAddress: ip,
  });

  return NextResponse.json({
    ok: true,
    redirectTo: user.role === "ADMIN" ? "/admin" : "/supplier",
  });
}
