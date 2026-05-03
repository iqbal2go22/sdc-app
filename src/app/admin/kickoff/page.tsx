import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function KickoffPage() {
  const totalContacts = await prisma.user.count({
    where: { role: "SUPPLIER", active: true, vendorId: { not: null } },
  });

  const totalContactsWithToken = await prisma.user.count({
    where: {
      role: "SUPPLIER",
      active: true,
      kickoffTokens: { some: { usedAt: null, expiresAt: { gt: new Date() } } },
    },
  });

  const orphans = await prisma.vendor.findMany({
    where: { contacts: { none: { active: true } } },
    select: { id: true, name: true, _count: { select: { items: true } } },
  });

  const itemlessVendors = await prisma.vendor.findMany({
    where: { items: { none: {} } },
    select: { id: true, name: true, _count: { select: { contacts: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-siteone-gray" style={{ fontFamily: "var(--font-dm-serif)" }}>
          Kickoff CSV
        </h1>
        <p className="text-sm text-siteone-green-gray mt-1">
          Download a personalized-link CSV for your marketing tool to send. Per D13, tokens persist
          across re-downloads — old links keep working until used or expired.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-siteone-green-gray mb-4">
            Coverage
          </h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>{totalContacts.toLocaleString()}</strong> active contacts in the allowlist
            </div>
            <div>
              <strong>{totalContactsWithToken.toLocaleString()}</strong> have an unexpired kickoff token
            </div>
          </div>
          <a
            href="/api/admin/kickoff/download"
            className="btn-primary inline-block mt-6"
            download
          >
            Download Kickoff CSV
          </a>
          <p className="text-xs text-siteone-warm-gray mt-2">
            Format: VendorID, VendorName, ContactName, ContactEmail, KickoffURL
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-siteone-green-gray mb-4">
            Pre-flight check
          </h2>
          {orphans.length === 0 && itemlessVendors.length === 0 ? (
            <div className="text-sm text-siteone-green">All vendors have items and contacts.</div>
          ) : (
            <div className="space-y-3 text-sm">
              {orphans.length > 0 && (
                <div className="text-amber-800 bg-amber-50 px-3 py-2 rounded">
                  <strong>{orphans.length}</strong> vendors have items but no contacts —
                  they will not appear in the kickoff CSV.
                </div>
              )}
              {itemlessVendors.length > 0 && (
                <div className="text-amber-800 bg-amber-50 px-3 py-2 rounded">
                  <strong>{itemlessVendors.length}</strong> vendors have contacts but no items.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs text-amber-900">
        <strong>Sender-tool deployment notes:</strong>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Disable URL shortening / link wrapping for the <code>KickoffURL</code> column.</li>
          <li>Use an established SiteOne sender domain to avoid spam filters.</li>
          <li>Let the tool throttle by default — don&apos;t bypass.</li>
          <li>Test with one vendor before bulk send.</li>
        </ul>
      </div>
    </div>
  );
}
