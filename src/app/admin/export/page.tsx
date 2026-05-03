import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const submitted = await prisma.item.count({
    where: { wipedAt: null, submittedAt: { not: null } },
  });
  const total = await prisma.item.count({ where: { wipedAt: null } });
  const itemUomTotal = await prisma.itemUom.count({
    where: { removedAt: null, item: { wipedAt: null, submittedAt: { not: null } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-siteone-gray" style={{ fontFamily: "var(--font-dm-serif)" }}>
          PIM Export
        </h1>
        <p className="text-sm text-siteone-green-gray mt-1">
          Long-format CSV (per D15) — one row per item × UOM. Includes only items with{" "}
          <code className="bg-[var(--cream)] px-1 rounded">submittedAt</code> set.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="space-y-2 text-sm mb-6">
          <div>
            <strong>{submitted.toLocaleString()}</strong> of {total.toLocaleString()} items submitted
          </div>
          <div>
            <strong>{itemUomTotal.toLocaleString()}</strong> item-UOM rows in export
          </div>
        </div>
        <a href="/api/admin/export" download className="btn-primary inline-block">
          Download PIM CSV
        </a>
        <p className="text-xs text-siteone-warm-gray mt-3">
          Format: long CSV, UTF-8, RFC 4180 quoting. Includes the <code>Source</code> column (file vs added)
          per D19.
        </p>
      </div>
    </div>
  );
}
