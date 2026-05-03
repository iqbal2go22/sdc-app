// Kickoff token redemption — the personalized one-click link from the kickoff email lands here.
// Per D4: redeem token -> auto-authenticate -> force password setup on first login.
// If user already has a password, treat token redeem as a fast-login (still log the event).

import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { logEvent } from "@/lib/db/audit";

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <>
        <BrandHeader subtitle="Kickoff link" />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md bg-white rounded-lg shadow p-8 text-center">
            <h1 className="text-xl font-semibold text-siteone-gray mb-2">No token provided</h1>
            <p className="text-sm text-siteone-green-gray">
              The kickoff link appears to be malformed. Contact your SiteOne representative.
            </p>
          </div>
        </main>
      </>
    );
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
    return (
      <>
        <BrandHeader subtitle="Kickoff link" />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md bg-white rounded-lg shadow p-8 text-center">
            <h1 className="text-xl font-semibold text-siteone-gray mb-2">Link expired</h1>
            <p className="text-sm text-siteone-green-gray mb-6">
              This kickoff link has already been used or expired. Use your email and password to sign in,
              or request a password reset if you don&apos;t remember it.
            </p>
            <div className="flex gap-3 justify-center">
              <a href="/login" className="btn-primary">
                Sign in
              </a>
              <a href="/forgot-password" className="btn-secondary">
                Forgot password
              </a>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Redeem: mark token used, create session, log event.
  await prisma.kickoffToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });
  await createSession(tokenRow.userId);
  await logEvent({
    eventType: "KICKOFF_TOKEN_REDEEM",
    actorUserId: tokenRow.userId,
    vendorId: tokenRow.user.vendorId ?? null,
  });
  await logEvent({
    eventType: "SESSION_START",
    actorUserId: tokenRow.userId,
    vendorId: tokenRow.user.vendorId ?? null,
  });

  // No password set yet → force password setup. Otherwise → into the app.
  if (!tokenRow.user.credential) {
    redirect("/set-password?welcome=1");
  }
  redirect(tokenRow.user.role === "ADMIN" ? "/admin" : "/supplier");
}
