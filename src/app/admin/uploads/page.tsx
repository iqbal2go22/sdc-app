import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { UploadCard } from "./UploadCard";

export const dynamic = "force-dynamic";

export default async function UploadsPage() {
  const history = await prisma.uploadHistory.findMany({
    orderBy: { uploadedAt: "desc" },
    take: 30,
    include: { uploadedBy: { select: { email: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-siteone-gray" style={{ fontFamily: "var(--font-dm-serif)" }}>
          Uploads
        </h1>
        <p className="text-sm text-siteone-green-gray mt-1">
          Upload UOM master, items, and contacts. Re-uploads use smart merge — no destructive deletes.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
        <strong>Setup order:</strong> 1. UOM Master &nbsp;→&nbsp; 2. Items &nbsp;→&nbsp; 3. Contacts. Items
        validate UOM codes against the master list; contacts reference vendors created from the items file.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UploadCard
          type="UOM_MASTER"
          title="UOM Master"
          description="Canonical UOM codes (UOMCode, UOMName, DefaultEDIUOM). Required before items upload."
          requiredColumns={["UOMCode", "UOMName"]}
          optionalColumns={["DefaultEDIUOM"]}
        />
        <UploadCard
          type="ITEMS"
          title="Items (long format)"
          description="One row per item × UOM. Item-level fields repeat across an item's UOM rows; SKUID + UOMCode is the unique key."
          requiredColumns={[
            "VendorID",
            "VendorName",
            "SKUID",
            "PIMItemNumber",
            "ProductName",
            "UOMCode",
          ]}
          optionalColumns={["BrandName", "TaxonomyClassPath", "MFGPartNumber", "ImageURL"]}
        />
        <UploadCard
          type="CONTACTS"
          title="Contacts"
          description="One row per (vendor, contact email). Joined to items table on VendorID."
          requiredColumns={["VendorID", "ContactEmail"]}
          optionalColumns={["ContactName"]}
        />
      </div>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-siteone-green-gray mb-4">
          Recent uploads
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-siteone-warm-gray">No uploads yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-siteone-green-gray border-b border-[var(--border)]">
              <tr>
                <th className="pb-2">Type</th>
                <th className="pb-2">Filename</th>
                <th className="pb-2">When</th>
                <th className="pb-2">By</th>
                <th className="pb-2 text-right">Rows</th>
                <th className="pb-2 text-right">Inserted</th>
                <th className="pb-2 text-right">Updated</th>
                <th className="pb-2 text-right">Errors</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {history.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 font-mono text-xs">{u.type}</td>
                  <td className="py-2 text-siteone-gray">{u.filename}</td>
                  <td className="py-2 text-xs text-siteone-green-gray">
                    {formatRelativeTime(u.uploadedAt)}
                  </td>
                  <td className="py-2 text-xs">{u.uploadedBy.email}</td>
                  <td className="py-2 text-right tabular-nums">{u.rowCount ?? 0}</td>
                  <td className="py-2 text-right tabular-nums text-siteone-green">
                    {u.insertedCount ?? 0}
                  </td>
                  <td className="py-2 text-right tabular-nums">{u.updatedCount ?? 0}</td>
                  <td className="py-2 text-right tabular-nums">
                    {u.errorCount ? (
                      <span className="text-[var(--red)]">{u.errorCount}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="py-2 text-xs">{u.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
