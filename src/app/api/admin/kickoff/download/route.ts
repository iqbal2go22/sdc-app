import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { ensureKickoffTokenForUser } from "@/lib/kickoff";
import { logEvent } from "@/lib/db/audit";
import { env } from "@/lib/env";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contacts = await prisma.user.findMany({
    where: {
      role: "SUPPLIER",
      active: true,
      vendorId: { not: null },
      vendor: { items: { some: {} } }, // skip vendors with no items
    },
    include: { vendor: true },
    orderBy: [{ vendor: { name: "asc" } }, { email: "asc" }],
  });

  const lines = ["VendorID,VendorName,ContactName,ContactEmail,KickoffURL"];
  for (const c of contacts) {
    const token = await ensureKickoffTokenForUser(c.id);
    const url = `${env.NEXT_PUBLIC_APP_URL}/start?token=${token}`;
    lines.push(
      [
        c.vendorId ?? "",
        c.vendor?.name ?? "",
        c.name ?? "",
        c.email,
        url,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  const csv = lines.join("\r\n") + "\r\n";

  await logEvent({
    eventType: "KICKOFF_CSV_DOWNLOAD",
    actorUserId: admin.id,
    eventData: { contactCount: contacts.length },
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sdc-kickoff-${stamp}.csv"`,
    },
  });
}
