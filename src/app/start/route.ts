// Kickoff token redemption — handler at /start. The personalized one-click link from
// the kickoff email lands here as a GET. Per D4: redeem token → auto-authenticate →
// force password setup on first login.
//
// This is a Route Handler (not a Server Component page) because Next.js 16 only allows
// cookie writes from Route Handlers / Server Actions. The previous page-based version
// errored with "Cookies can only be modified in a Server Action or Route Handler".

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { logEvent } from "@/lib/db/audit";
import { publicUrl } from "@/lib/url";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return redirectWithError(request, "Kickoff link is missing a token.");
  }

  const tokenRow = await prisma.kickoffToken.findUnique({
    where: { token },
    include: { user: { include: { credential: true } } },
  });

  const expired =
    !tokenRow ||
    tokenRow.usedAt !== null ||
    tokenRow.expiresAt.getTime() < Date.now() ||
    !tokenRow.user.active;

  if (expired) {
    return redirectWithError(
      request,
      "Kickoff link has already been used or expired. Sign in with your password instead.",
    );
  }

  // Redeem: mark used, create session, log events.
  await prisma.kickoffToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;

  await createSession(tokenRow.userId, ip, userAgent);
  await logEvent({
    eventType: "KICKOFF_TOKEN_REDEEM",
    actorUserId: tokenRow.userId,
    vendorId: tokenRow.user.vendorId ?? null,
    ipAddress: ip ?? null,
  });
  await logEvent({
    eventType: "SESSION_START",
    actorUserId: tokenRow.userId,
    vendorId: tokenRow.user.vendorId ?? null,
    ipAddress: ip ?? null,
  });

  // No password set yet → force password setup. Otherwise → into the app.
  const target = !tokenRow.user.credential
    ? "/set-password?welcome=1"
    : tokenRow.user.role === "ADMIN"
      ? "/admin"
      : "/supplier";

  return NextResponse.redirect(publicUrl(request, target), { status: 303 });
}

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL(publicUrl(request, "/login"));
  url.searchParams.set("error", message);
  return NextResponse.redirect(url.toString(), { status: 303 });
}
