import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logEvent } from "@/lib/db/audit";

const Body = z.object({
  kind: z.enum(["ITEMS", "CONTACTS"]),
  confirm: z.string().min(1),
});

const PHRASES = { ITEMS: "WIPE ITEMS", CONTACTS: "WIPE CONTACTS" } as const;

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { kind, confirm } = parsed.data;
  if (confirm !== PHRASES[kind]) {
    return NextResponse.json({ error: "Confirmation phrase mismatch." }, { status: 400 });
  }

  let deletedCount = 0;
  if (kind === "ITEMS") {
    // Pre-count for audit + cascade-deletes via FK rules.
    const itemCount = await prisma.item.count();
    await prisma.$transaction([
      // Cascades: itemUom (FK), auditLog.itemId (SetNull on item delete).
      prisma.item.deleteMany({}),
    ]);
    deletedCount = itemCount;

    await logEvent({
      eventType: "WIPE_ITEMS",
      actorUserId: admin.id,
      eventData: { deletedItems: itemCount },
    });
  } else {
    const beforeContacts = await prisma.user.count({ where: { role: "SUPPLIER" } });
    const beforeSessions = await prisma.session.count({ where: { user: { role: "SUPPLIER" } } });
    const beforeTokens = await prisma.kickoffToken.count({ where: { usedAt: null } });

    // Cascade: deleting User cascades to PasswordCredential, Session, KickoffToken, PasswordResetToken.
    await prisma.user.deleteMany({ where: { role: "SUPPLIER" } });
    deletedCount = beforeContacts;

    await logEvent({
      eventType: "WIPE_CONTACTS",
      actorUserId: admin.id,
      eventData: {
        deletedContacts: beforeContacts,
        terminatedSessions: beforeSessions,
        invalidatedTokens: beforeTokens,
      },
    });
  }

  return NextResponse.json({ ok: true, deletedCount });
}
