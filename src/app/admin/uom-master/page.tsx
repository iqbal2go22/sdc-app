import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UomMasterPage() {
  const uoms = await prisma.uomMaster.findMany({
    orderBy: [{ active: "desc" }, { displayOrder: "asc" }, { code: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-siteone-gray" style={{ fontFamily: "var(--font-dm-serif)" }}>
          UOM Master List
        </h1>
        <p className="text-sm text-siteone-green-gray mt-1">
          Canonical UOM codes — uploaded via the UOM master file. Items can only reference codes
          present here. {uoms.length} entries total.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--cream)] text-siteone-green-gray uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Code</th>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Default EDI UOM</th>
              <th className="text-right px-4 py-3 font-semibold">Display order</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Last update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {uoms.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-siteone-warm-gray">
                  No UOM master loaded yet. Upload the UOM master file from the Uploads page.
                </td>
              </tr>
            ) : (
              uoms.map((u) => (
                <tr key={u.code}>
                  <td className="px-4 py-2 font-mono font-semibold text-siteone-gray">{u.code}</td>
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{u.defaultEdiUom}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{u.displayOrder}</td>
                  <td className="px-4 py-2">
                    {u.active ? (
                      <span className="text-siteone-green text-xs">Active</span>
                    ) : (
                      <span className="text-siteone-warm-gray text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-siteone-green-gray text-right">
                    {formatRelativeTime(u.updatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
