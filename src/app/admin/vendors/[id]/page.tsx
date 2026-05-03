// Vendor Detail — drill-down per D21.
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatActiveTime, formatDate, formatRelativeTime } from "@/lib/utils";
import { ResendKickoffButton } from "./ResendKickoffButton";
import { RevokeContactButton } from "./RevokeContactButton";

export const dynamic = "force-dynamic";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: { email: "asc" },
        include: { sessions: { select: { activeMs: true } } },
      },
      items: {
        where: { wipedAt: null },
        orderBy: { skuId: "asc" },
        include: { itemUoms: { where: { removedAt: null } } },
      },
    },
  });
  if (!vendor) notFound();

  const recentEvents = await prisma.auditLog.findMany({
    where: { vendorId: id },
    orderBy: { occurredAt: "desc" },
    take: 50,
    include: { actor: { select: { email: true } } },
  });

  const submitted = vendor.items.filter((i) => i.submittedAt !== null).length;
  const total = vendor.items.length;
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <Link href="/admin/vendors" className="text-xs text-siteone-blue hover:underline">
            ← All vendors
          </Link>
          <h1
            className="text-3xl text-siteone-gray mt-2"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            {vendor.name}
          </h1>
          <p className="text-sm text-siteone-green-gray">
            Vendor ID <span className="font-mono">{vendor.id}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-siteone-green-gray font-semibold">
            Completion
          </div>
          <div className="text-3xl font-semibold text-siteone-green tabular-nums">{pct}%</div>
          <div className="text-xs text-siteone-warm-gray">
            {submitted} of {total} items submitted
          </div>
        </div>
      </div>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-siteone-green-gray mb-4">
          Contacts ({vendor.contacts.length})
        </h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-siteone-green-gray border-b border-[var(--border)]">
            <tr>
              <th className="pb-2 font-semibold">Email</th>
              <th className="pb-2 font-semibold">Name</th>
              <th className="pb-2 font-semibold">Status</th>
              <th className="pb-2 font-semibold text-right">Time on app</th>
              <th className="pb-2 font-semibold text-right">Last login</th>
              <th className="pb-2 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {vendor.contacts.map((c) => {
              const totalMs = c.sessions.reduce((s, sess) => s + sess.activeMs, 0);
              return (
                <tr key={c.id}>
                  <td className="py-2 text-siteone-gray">{c.email}</td>
                  <td className="py-2">{c.name ?? "—"}</td>
                  <td className="py-2">
                    {c.active ? (
                      <span className="text-siteone-green text-xs">Active</span>
                    ) : (
                      <span className="text-siteone-warm-gray text-xs">Revoked</span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatActiveTime(totalMs)}</td>
                  <td className="py-2 text-right text-xs text-siteone-green-gray">
                    {formatRelativeTime(c.lastLoginAt)}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <ResendKickoffButton userId={c.id} />
                      {c.active && <RevokeContactButton userId={c.id} email={c.email} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-siteone-green-gray mb-4">
          Items ({vendor.items.length})
        </h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-siteone-green-gray border-b border-[var(--border)]">
            <tr>
              <th className="pb-2 font-semibold">SKU</th>
              <th className="pb-2 font-semibold">Product</th>
              <th className="pb-2 font-semibold"># UOMs</th>
              <th className="pb-2 font-semibold">Status</th>
              <th className="pb-2 font-semibold">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {vendor.items.map((it) => {
              const total = it.itemUoms.length;
              const filled = it.itemUoms.filter(
                (u) => u.weight !== null && u.uomQuantity !== null,
              ).length;
              return (
                <tr key={it.skuId}>
                  <td className="py-2 font-mono text-xs">{it.skuId}</td>
                  <td className="py-2 text-siteone-gray">{it.productName}</td>
                  <td className="py-2">
                    {filled} / {total}
                  </td>
                  <td className="py-2">
                    {it.submittedAt ? (
                      <span className="text-siteone-green text-xs font-medium">Submitted</span>
                    ) : filled > 0 ? (
                      <span className="text-siteone-blue text-xs">In progress</span>
                    ) : (
                      <span className="text-siteone-warm-gray text-xs">Not started</span>
                    )}
                  </td>
                  <td className="py-2 text-xs text-siteone-green-gray">
                    {formatDate(it.submittedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-siteone-green-gray mb-4">
          Activity log
        </h2>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-siteone-warm-gray">No events yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {recentEvents.map((e) => (
              <li key={e.id.toString()} className="py-2 text-sm flex items-center gap-3">
                <span className="font-medium text-siteone-gray flex-1">
                  {e.eventType.replace(/_/g, " ").toLowerCase()}
                </span>
                {e.actor && (
                  <span className="text-xs text-siteone-green-gray">{e.actor.email}</span>
                )}
                <span className="text-xs text-siteone-warm-gray">
                  {formatRelativeTime(e.occurredAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
