import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const Body = z.object({ deltaMs: z.number().min(0).max(120_000) });

export async function POST(request: Request) {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await prisma.session
    .update({
      where: { id: sessionId },
      data: { activeMs: { increment: parsed.deltaMs }, lastSeenAt: new Date() },
    })
    .catch(() => {}); // session may have been deleted concurrently

  return NextResponse.json({ ok: true });
}
