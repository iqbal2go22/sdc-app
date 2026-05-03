import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logEvent } from "@/lib/db/audit";

const Body = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user || user.role !== "SUPPLIER") {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { active: false },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.kickoffToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  await logEvent({
    eventType: "CONTACT_REVOCATION",
    actorUserId: admin.id,
    vendorId: user.vendorId ?? null,
    eventData: { revokedEmail: user.email, revokedUserId: user.id },
  });

  return NextResponse.json({ ok: true });
}
