import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { destroySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { logEvent } from "@/lib/db/audit";

export async function POST() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (session) {
      await logEvent({
        eventType: "SESSION_END",
        actorUserId: session.userId,
        eventData: { activeMs: session.activeMs },
      });
      await logEvent({ eventType: "LOGOUT", actorUserId: session.userId });
    }
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
