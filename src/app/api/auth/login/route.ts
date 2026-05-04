import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { isLocked, recordLoginFailure, clearLockout } from "@/lib/auth/lockout";
import { logEvent } from "@/lib/db/audit";

// Handles BOTH application/json (programmatic clients) and form-encoded posts
// (the login page submits natively to dodge Next 16 dev-mode hydration flakiness).
const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;
  const contentType = request.headers.get("content-type") || "";
  const isFormSubmit =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  let email: string;
  let password: string;
  try {
    if (isFormSubmit) {
      const fd = await request.formData();
      const parsed = Body.parse({
        email: String(fd.get("email") ?? ""),
        password: String(fd.get("password") ?? ""),
      });
      email = parsed.email;
      password = parsed.password;
    } else {
      const parsed = Body.parse(await request.json());
      email = parsed.email;
      password = parsed.password;
    }
  } catch {
    return fail(request, isFormSubmit, "Invalid request", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { credential: true },
  });

  // Generic message regardless of cause to avoid email-enumeration leak.
  const GENERIC_FAIL = "Email or password is incorrect.";

  if (!user || !user.active || !user.credential) {
    await logEvent({ eventType: "LOGIN_FAILURE", ipAddress: ip, eventData: { email } });
    return fail(request, isFormSubmit, GENERIC_FAIL, 401);
  }

  if (isLocked(user)) {
    await logEvent({
      eventType: "LOGIN_FAILURE",
      actorUserId: user.id,
      ipAddress: ip,
      eventData: { reason: "locked" },
    });
    return fail(
      request,
      isFormSubmit,
      "Account is temporarily locked. Try again later.",
      423,
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
    return fail(request, isFormSubmit, GENERIC_FAIL, 401);
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

  const redirectTo = user.role === "ADMIN" ? "/admin" : "/supplier";

  if (isFormSubmit) {
    return NextResponse.redirect(new URL(redirectTo, request.url), { status: 303 });
  }
  return NextResponse.json({ ok: true, redirectTo });
}

function fail(
  request: NextRequest,
  isFormSubmit: boolean,
  message: string,
  status: number,
) {
  if (isFormSubmit) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url, { status: 303 });
  }
  return NextResponse.json({ error: message }, { status });
}
