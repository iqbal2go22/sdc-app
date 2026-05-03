// Wipe operations (D11/D12). Type-to-confirm with detailed pre-wipe impact screen.
import { prisma } from "@/lib/prisma";
import { WipeCard } from "./WipeCard";

export const dynamic = "force-dynamic";

export default async function WipePage() {
  const [
    itemCount,
    vendorCount,
    itemUomCount,
    itemSubmittedCount,
    itemUomWithDataCount,
    contactCount,
    activeSessionCount,
    pendingTokenCount,
  ] = await Promise.all([
    prisma.item.count({ where: { wipedAt: null } }),
    prisma.vendor.count(),
    prisma.itemUom.count({ where: { removedAt: null } }),
    prisma.item.count({ where: { wipedAt: null, submittedAt: { not: null } } }),
    prisma.itemUom.count({
      where: { removedAt: null, OR: [{ weight: { not: null } }, { uomQuantity: { not: null } }] },
    }),
    prisma.user.count({ where: { role: "SUPPLIER", active: true } }),
    prisma.session.count({
      where: { expiresAt: { gt: new Date() }, user: { role: "SUPPLIER" } },
    }),
    prisma.kickoffToken.count({ where: { usedAt: null, expiresAt: { gt: new Date() } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-siteone-gray" style={{ fontFamily: "var(--font-dm-serif)" }}>
          Wipe operations
        </h1>
        <p className="text-sm text-siteone-green-gray mt-1">
          Nuclear reset. Both wipes are permanent and require typing the exact phrase to confirm.
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-900">
        <strong>Read this before clicking anything.</strong> These actions hard-delete data with no
        undo. Audit log entries are preserved (per D12). Vendors are not directly deleted — they will
        be re-created from the next items upload.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WipeCard
          kind="ITEMS"
          title="Wipe all items"
          confirmPhrase="WIPE ITEMS"
          impact={[
            { label: "Items", count: itemCount, scope: `across ${vendorCount} vendors` },
            { label: "Item-UOM rows", count: itemUomCount },
            { label: "In-progress UOM entries", count: itemUomWithDataCount },
            { label: "Submitted items", count: itemSubmittedCount },
          ]}
        />
        <WipeCard
          kind="CONTACTS"
          title="Wipe all contacts"
          confirmPhrase="WIPE CONTACTS"
          impact={[
            { label: "Active contacts", count: contactCount },
            { label: "Active sessions (will be terminated)", count: activeSessionCount },
            { label: "Pending kickoff tokens (will be invalidated)", count: pendingTokenCount },
          ]}
        />
      </div>
    </div>
  );
}
