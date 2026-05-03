// Supplier dashboard — item queue.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SupplierDashboardPage() {
  const user = await getSessionUser();
  if (!user || !user.vendorId) redirect("/login");

  const items = await prisma.item.findMany({
    where: { vendorId: user.vendorId, wipedAt: null },
    orderBy: { skuId: "asc" },
    include: {
      itemUoms: {
        where: { removedAt: null },
        select: { uomCode: true, weight: true, uomQuantity: true },
      },
    },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl text-siteone-gray" style={{ fontFamily: "var(--font-dm-serif)" }}>
          Your items
        </h1>
        <p className="text-sm text-siteone-green-gray mt-1">
          Click an item to enter UOM, dimension, and logistics data. You can save and come back —
          progress persists across sessions.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--cream)] text-siteone-green-gray uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">SKU</th>
              <th className="text-left px-4 py-3 font-semibold">Product</th>
              <th className="text-left px-4 py-3 font-semibold">Brand</th>
              <th className="text-left px-4 py-3 font-semibold">Taxonomy</th>
              <th className="text-left px-4 py-3 font-semibold">UOMs</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-siteone-warm-gray">
                  No items assigned yet. Contact SiteOne if this seems wrong.
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const total = it.itemUoms.length;
                const filled = it.itemUoms.filter(
                  (u) => u.weight !== null && u.uomQuantity !== null,
                ).length;
                const submitted = it.submittedAt !== null;
                return (
                  <tr key={it.skuId} className="hover:bg-[var(--off-white)]">
                    <td className="px-4 py-3 font-mono text-xs">{it.skuId}</td>
                    <td className="px-4 py-3 text-siteone-gray">
                      <Link
                        href={`/supplier/items/${it.skuId}`}
                        className="font-medium hover:text-siteone-green hover:underline"
                      >
                        {it.productName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-siteone-green-gray">{it.brandName ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-siteone-green-gray max-w-xs truncate">
                      {it.taxonomyClassPath ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {it.itemUoms.map((u) => u.uomCode).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      {submitted ? (
                        <span className="bg-[var(--green-light)] text-siteone-green text-xs px-2 py-0.5 rounded font-medium">
                          Submitted
                        </span>
                      ) : filled > 0 ? (
                        <span className="bg-blue-50 text-siteone-blue text-xs px-2 py-0.5 rounded font-medium">
                          {filled} / {total} UOMs filled
                        </span>
                      ) : (
                        <span className="bg-[var(--cream)] text-siteone-green-gray text-xs px-2 py-0.5 rounded">
                          Not started
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/supplier/items/${it.skuId}`}
                        className="text-siteone-green text-xs font-medium hover:underline"
                      >
                        {submitted ? "View" : "Open →"}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
