// Admin Overview — campaign-wide KPIs, status breakdown, recent activity feed.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCampaignStats } from "@/lib/stats";
import { formatActiveTime, formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const stats = await getCampaignStats();

  const recent = await prisma.auditLog.findMany({
    orderBy: { occurredAt: "desc" },
    take: 20,
    include: {
      actor: { select: { email: true, role: true } },
      vendor: { select: { name: true } },
    },
  });

  const submittedPct =
    stats.totalItems > 0 ? Math.round((stats.itemsSubmitted / stats.totalItems) * 100) : 0;
  const loginPct =
    stats.totalVendors > 0 ? Math.round((stats.vendorsWithLogin / stats.totalVendors) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl text-siteone-gray"
          style={{ fontFamily: "var(--font-dm-serif)" }}
        >
          Campaign Overview
        </h1>
        <p className="text-sm text-siteone-green-gray mt-1">
          High-level snapshot of the supplier data collection campaign.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Kpi label="Vendors" value={stats.totalVendors.toLocaleString()} />
        <Kpi label="Items" value={stats.totalItems.toLocaleString()} />
        <Kpi
          label="Items submitted"
          value={`${stats.itemsSubmitted.toLocaleString()}`}
          sub={`${submittedPct}% of items`}
        />
        <Kpi
          label="Vendors logged in"
          value={`${stats.vendorsWithLogin.toLocaleString()}`}
          sub={`${loginPct}% of vendors`}
        />
        <Kpi label="Total time on app" value={formatActiveTime(stats.totalActiveMs)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-siteone-green-gray mb-4">
            Vendor Status
          </h2>
          <StatusRow color="bg-siteone-warm-gray" label="Not started" count={stats.vendorsNotStarted} total={stats.totalVendors} />
          <StatusRow color="bg-siteone-blue" label="In progress" count={stats.vendorsInProgress} total={stats.totalVendors} />
          <StatusRow color="bg-siteone-green" label="Complete" count={stats.vendorsComplete} total={stats.totalVendors} />
          <div className="mt-4">
            <Link
              href="/admin/vendors"
              className="text-sm text-siteone-green hover:underline font-medium"
            >
              View all vendors →
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-siteone-green-gray mb-4">
            Recent Activity
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-siteone-warm-gray">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {recent.map((e) => (
                <li key={e.id.toString()} className="py-2 text-sm flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-siteone-gray">
                      {e.eventType.replace(/_/g, " ").toLowerCase()}
                    </span>
                    {e.actor && (
                      <span className="text-siteone-green-gray ml-2 truncate">— {e.actor.email}</span>
                    )}
                    {e.vendor && (
                      <span className="text-siteone-green-gray ml-2 truncate">@ {e.vendor.name}</span>
                    )}
                  </div>
                  <span className="text-xs text-siteone-warm-gray flex-shrink-0">
                    {formatRelativeTime(e.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="text-xs uppercase tracking-wider text-siteone-green-gray font-semibold">{label}</div>
      <div className="text-3xl font-semibold text-siteone-gray mt-2" style={{ fontFamily: "var(--font-dm-serif)" }}>
        {value}
      </div>
      {sub && <div className="text-xs text-siteone-warm-gray mt-1">{sub}</div>}
    </div>
  );
}

function StatusRow({ color, label, count, total }: { color: string; label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between text-sm mb-1">
        <span className="text-siteone-gray">{label}</span>
        <span className="text-siteone-green-gray text-xs">
          {count.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-[var(--cream)] rounded">
        <div className={`${color} h-full rounded`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
