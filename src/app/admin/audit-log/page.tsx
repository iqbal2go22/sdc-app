import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; vendor?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (sp.event) where.eventType = sp.event;
  if (sp.vendor) where.vendor = { name: { contains: sp.vendor, mode: "insensitive" } };

  const [events, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        actor: { select: { email: true, role: true } },
        vendor: { select: { id: true, name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const eventTypes = [
    "LOGIN_SUCCESS",
    "LOGIN_FAILURE",
    "LOGOUT",
    "PASSWORD_RESET_REQUEST",
    "PASSWORD_RESET_COMPLETE",
    "KICKOFF_TOKEN_REDEEM",
    "SESSION_START",
    "SESSION_END",
    "ITEM_OPENED",
    "ITEM_SUBMITTED",
    "UOM_ADDED",
    "UOM_REMOVED",
    "FILE_UPLOAD",
    "KICKOFF_CSV_DOWNLOAD",
    "PIM_EXPORT",
    "WIPE_ITEMS",
    "WIPE_CONTACTS",
    "WIPE_VENDORS",
    "CONTACT_REVOCATION",
    "ITEM_REVOCATION",
    "ADMIN_LOGIN",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl text-siteone-gray" style={{ fontFamily: "var(--font-dm-serif)" }}>
            Audit Log
          </h1>
          <p className="text-sm text-siteone-green-gray mt-1">
            {total.toLocaleString()} events • Page {page} of {totalPages}
          </p>
        </div>
        <form className="flex gap-2 items-end" method="get">
          <div>
            <label className="block text-xs font-medium text-siteone-green-gray uppercase mb-1">
              Event
            </label>
            <select name="event" defaultValue={sp.event ?? ""} className="input">
              <option value="">All</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-siteone-green-gray uppercase mb-1">
              Vendor name
            </label>
            <input
              name="vendor"
              defaultValue={sp.vendor ?? ""}
              className="input w-48"
              placeholder="contains…"
            />
          </div>
          <button type="submit" className="btn-primary">
            Filter
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--cream)] text-siteone-green-gray uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">When</th>
              <th className="text-left px-4 py-3 font-semibold">Event</th>
              <th className="text-left px-4 py-3 font-semibold">Actor</th>
              <th className="text-left px-4 py-3 font-semibold">Vendor</th>
              <th className="text-left px-4 py-3 font-semibold">Item</th>
              <th className="text-left px-4 py-3 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-siteone-warm-gray">
                  No events match.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id.toString()}>
                  <td className="px-4 py-2 text-xs text-siteone-green-gray whitespace-nowrap">
                    {formatDate(e.occurredAt)}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">{e.eventType}</td>
                  <td className="px-4 py-2 text-xs">{e.actor?.email ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">
                    {e.vendor ? (
                      <Link
                        href={`/admin/vendors/${e.vendor.id}`}
                        className="text-siteone-blue hover:underline"
                      >
                        {e.vendor.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">{e.itemId ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-siteone-green-gray max-w-xs truncate">
                    {e.eventData ? JSON.stringify(e.eventData) : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 20).map((n) => {
            const params = new URLSearchParams();
            if (sp.event) params.set("event", sp.event);
            if (sp.vendor) params.set("vendor", sp.vendor);
            params.set("page", String(n));
            return (
              <Link
                key={n}
                href={`?${params.toString()}`}
                className={
                  n === page
                    ? "px-3 py-1 bg-siteone-green text-white rounded"
                    : "px-3 py-1 bg-white text-siteone-gray rounded border border-[var(--border)] hover:border-siteone-green"
                }
              >
                {n}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
