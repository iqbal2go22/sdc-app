import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/supplier");
  const sp = await searchParams;

  return (
    <>
      <BrandHeader subtitle="Sign In" />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-10">
          <h1
            className="text-2xl text-siteone-gray mb-1"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            Sign in
          </h1>
          <p className="text-sm text-siteone-green-gray mb-8">
            Enter the email address you received the kickoff email at.
          </p>
          <LoginForm next={sp.next} initialError={sp.error} />
          <div className="mt-6 pt-6 border-t border-[var(--border)] text-sm text-siteone-warm-gray">
            <Link href="/forgot-password" className="text-siteone-blue hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
