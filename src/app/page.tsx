import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { getSessionUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/supplier");
  }

  return (
    <>
      <BrandHeader subtitle="Supplier Data Collection" />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow p-12 text-center">
          <h1
            className="text-3xl text-siteone-gray mb-4"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            Supplier Data Collection
          </h1>
          <p className="text-siteone-green-gray mb-8">
            SiteOne&apos;s portal for collecting product UOM, dimension, and logistics data from suppliers.
            If you&apos;ve received a kickoff email, click the link in that message. Otherwise sign in below.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login" className="btn-primary">
              Sign in
            </Link>
            <Link href="/forgot-password" className="btn-secondary">
              Forgot password
            </Link>
          </div>
          <div className="mt-10 pt-6 border-t border-[var(--border)] text-xs text-siteone-warm-gray">
            Need help? Contact your SiteOne representative.
          </div>
        </div>
      </main>
    </>
  );
}
