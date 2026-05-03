import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { regenerateKickoffTokenForUser } from "@/lib/kickoff";
import { env } from "@/lib/env";

const Body = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user || user.role !== "SUPPLIER") {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Invalidate any unused tokens, then mint a fresh one.
  await prisma.kickoffToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  const token = await regenerateKickoffTokenForUser(user.id);
  return NextResponse.json({
    ok: true,
    token,
    url: `${env.NEXT_PUBLIC_APP_URL}/start?token=${token}`,
  });
}
