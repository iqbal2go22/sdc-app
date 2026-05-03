import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { UserMenu } from "@/components/UserMenu";
import { Heartbeat } from "@/components/Heartbeat";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ProgressIndicator } from "./ProgressIndicator";

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/supplier");
  if (user.role !== "SUPPLIER" || !user.vendorId) redirect("/admin");

  const credential = await prisma.passwordCredential.findUnique({
    where: { userId: user.id },
  });
  if (!credential) redirect("/set-password?welcome=1");

  const vendor = await prisma.vendor.findUnique({
    where: { id: user.vendorId },
    include: {
      items: { where: { wipedAt: null }, select: { skuId: true, submittedAt: true } },
    },
  });
  if (!vendor) {
    return (
      <>
        <BrandHeader subtitle="Supplier portal" rightSlot={<UserMenu email={user.email} />} />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="bg-white p-8 rounded shadow max-w-md text-center">
            <h1 className="text-xl font-semibold text-siteone-gray mb-2">No items assigned</h1>
            <p className="text-sm text-siteone-green-gray">
              No items are linked to your vendor account yet. Contact SiteOne if this seems wrong.
            </p>
          </div>
        </main>
      </>
    );
  }

  const submitted = vendor.items.filter((i) => i.submittedAt !== null).length;
  const total = vendor.items.length;

  return (
    <>
      <Heartbeat />
      <BrandHeader
        subtitle="Supplier portal"
        rightSlot={
          <>
            <ProgressIndicator submitted={submitted} total={total} vendorName={vendor.name} />
            <UserMenu email={user.email} />
          </>
        }
      />
      <div className="flex-1 px-6 md:px-12 py-8">{children}</div>
    </>
  );
}
