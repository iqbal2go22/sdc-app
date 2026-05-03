// Aggregate queries for the admin dashboard. POC computes inline; production should
// materialize a `vendor_stats` view or maintain a cache for the Vendor List view (D21 perf note).

import { prisma } from "@/lib/prisma";

export type CampaignStats = {
  totalVendors: number;
  totalItems: number;
  itemsSubmitted: number;
  vendorsWithLogin: number;
  totalActiveMs: number;
  vendorsNotStarted: number;
  vendorsInProgress: number;
  vendorsComplete: number;
};

export async function getCampaignStats(): Promise<CampaignStats> {
  const [
    totalVendors,
    totalItems,
    itemsSubmitted,
    vendorsWithLogin,
    activeMsAgg,
    vendorBreakdown,
  ] = await Promise.all([
    prisma.vendor.count(),
    prisma.item.count({ where: { wipedAt: null } }),
    prisma.item.count({ where: { wipedAt: null, submittedAt: { not: null } } }),
    prisma.user.count({
      where: { role: "SUPPLIER", lastLoginAt: { not: null } },
    }),
    prisma.session.aggregate({
      _sum: { activeMs: true },
      where: { user: { role: "SUPPLIER" } },
    }),
    computeVendorBreakdown(),
  ]);

  return {
    totalVendors,
    totalItems,
    itemsSubmitted,
    vendorsWithLogin,
    totalActiveMs: activeMsAgg._sum.activeMs ?? 0,
    ...vendorBreakdown,
  };
}

async function computeVendorBreakdown() {
  // Pull per-vendor item totals + submitted counts, classify into not-started / in-progress / complete.
  const vendors = await prisma.vendor.findMany({
    include: {
      items: { where: { wipedAt: null } },
      contacts: { select: { lastLoginAt: true }, where: { active: true } },
    },
  });
  let notStarted = 0;
  let inProgress = 0;
  let complete = 0;
  for (const v of vendors) {
    const total = v.items.length;
    const submitted = v.items.filter((i) => i.submittedAt !== null).length;
    const everLogged = v.contacts.some((c) => c.lastLoginAt !== null);
    if (total === 0) {
      notStarted++;
      continue;
    }
    if (submitted === total) complete++;
    else if (submitted > 0 || everLogged) inProgress++;
    else notStarted++;
  }
  return { vendorsNotStarted: notStarted, vendorsInProgress: inProgress, vendorsComplete: complete };
}

export type VendorRow = {
  id: string;
  name: string;
  contactCount: number;
  itemCount: number;
  itemsSubmitted: number;
  status: "Not started" | "In progress" | "Complete";
  percentComplete: number;
  totalActiveMs: number;
  lastActivityAt: Date | null;
  firstLoginAt: Date | null;
  addedUomCount: number;
};

export async function getVendorList(): Promise<VendorRow[]> {
  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
    include: {
      contacts: {
        where: { active: true },
        include: { sessions: { select: { activeMs: true } } },
      },
      items: {
        where: { wipedAt: null },
        select: { skuId: true, submittedAt: true },
      },
    },
  });

  const result: VendorRow[] = [];
  for (const v of vendors) {
    const total = v.items.length;
    const submitted = v.items.filter((i) => i.submittedAt !== null).length;
    const status: VendorRow["status"] =
      total === 0
        ? "Not started"
        : submitted === total
          ? "Complete"
          : submitted > 0 || v.contacts.some((c) => c.lastLoginAt !== null)
            ? "In progress"
            : "Not started";

    const totalActiveMs = v.contacts.reduce(
      (sum, c) => sum + c.sessions.reduce((s, sess) => s + sess.activeMs, 0),
      0,
    );

    const lastLoginCandidates = v.contacts.map((c) => c.lastLoginAt).filter(Boolean) as Date[];
    const firstLoginAt =
      lastLoginCandidates.length > 0
        ? new Date(Math.min(...lastLoginCandidates.map((d) => d.getTime())))
        : null;

    // last activity per vendor — pull from audit_log
    const lastEvent = await prisma.auditLog.findFirst({
      where: { vendorId: v.id },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true },
    });

    const addedUomCount = await prisma.itemUom.count({
      where: { source: "ADDED", item: { vendorId: v.id, wipedAt: null } },
    });

    result.push({
      id: v.id,
      name: v.name,
      contactCount: v.contacts.length,
      itemCount: total,
      itemsSubmitted: submitted,
      status,
      percentComplete: total > 0 ? Math.round((submitted / total) * 100) : 0,
      totalActiveMs,
      lastActivityAt: lastEvent?.occurredAt ?? null,
      firstLoginAt,
      addedUomCount,
    });
  }
  return result;
}
