// Vendor List — main working view per D21.
import Link from "next/link";
import { getVendorList } from "@/lib/stats";
import { formatActiveTime, formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VendorListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const all = await getVendorList();

  const filterStatus = sp.status?.toLowerCase();
  const query = (sp.q ?? "").trim().toLowerCase();

  const rows = all.filter((v) => {
    if (filterStatus && filterStatus !== "all") {
      const slug = v.status.toLowerCase().replace(/\s+/g, "-");
      if (slug !== filterStatus) return false;
    }
    if (query && !v.name.toLowerCase().includes(query) && !v.id.toLowerCase().includes(query))
      return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl text-siteone-gray" style={{ fontFamily: "var(--font-dm-serif)" }}>
            Vendors
          </h1>
          <p className="text-sm text-siteone-green-gray mt-1">
            {rows.length.toLocaleString()} of {all.length.toLocaleString()} shown
          </p>
        </div>
        <form className="flex gap-2 items-end" method="get">
          <div>
            <label className="block text-xs font-medium text-siteone-green-gray uppercase mb-1">
              Search
            </label>
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Vendor name or ID"
              className="input w-64"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-siteone-green-gray uppercase mb-1">
              Status
            </label>
            <select name="status" defaultValue={filterStatus ?? "all"} className="input">
              <option value="all">All</option>
              <option value="not-started">Not started</option>
              <option value="in-progress">In progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Apply
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--cream)] text-siteone-green-gray uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Vendor</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold"># Items</th>
              <th className="text-right px-4 py-3 font-semibold"># Contacts</th>
              <th className="text-right px-4 py-3 font-semibold">% Complete</th>
              <th className="text-right px-4 py-3 font-semibold">Time on app</th>
              <th className="text-right px-4 py-3 font-semibold">Last activity</th>
              <th className="text-right px-4 py-3 font-semibold">First login</th>
              <th className="text-right px-4 py-3 font-semibold">Added UOMs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-siteone-warm-gray">
                  No vendors match.
                </td>
              </tr>
            ) : (
              rows.map((v) => (
                <tr key={v.id} className="hover:bg-[var(--off-white)]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/vendors/${v.id}`} className="text-siteone-gray font-medium hover:text-siteone-green hover:underline">
                      {v.name}
                    </Link>
                    <div className="text-xs text-siteone-warm-gray">{v.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{v.itemCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{v.contactCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-[var(--cream)] rounded overflow-hidden">
                        <div
                          className="h-full bg-siteone-green"
                          style={{ width: `${v.percentComplete}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-xs">{v.percentComplete}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-siteone-green-gray tabular-nums">
                    {formatActiveTime(v.totalActiveMs)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-siteone-green-gray">
                    {formatRelativeTime(v.lastActivityAt)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-siteone-green-gray">
                    {formatRelativeTime(v.firstLoginAt)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {v.addedUomCount > 0 ? (
                      <span className="text-siteone-blue font-medium">{v.addedUomCount}</span>
                    ) : (
                      <span className="text-siteone-warm-gray">—</span>
                    )}
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

function StatusBadge({ status }: { status: "Not started" | "In progress" | "Complete" }) {
  const colors = {
    "Not started": "bg-[var(--cream)] text-siteone-green-gray",
    "In progress": "bg-blue-50 text-siteone-blue",
    Complete: "bg-[var(--green-light)] text-siteone-green",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}
