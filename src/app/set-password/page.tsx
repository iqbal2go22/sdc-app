import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { requireUser } from "@/lib/auth/session";
import { SetPasswordForm } from "./SetPasswordForm";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");
  const sp = await searchParams;
  const isWelcome = sp.welcome === "1";

  return (
    <>
      <BrandHeader subtitle={isWelcome ? "Welcome — set your password" : "Set password"} />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-10">
          <h1
            className="text-2xl text-siteone-gray mb-1"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            {isWelcome ? "Welcome" : "Set a new password"}
          </h1>
          <p className="text-sm text-siteone-green-gray mb-8">
            {isWelcome
              ? "Set a password you'll use to sign in next time. Min 8 characters."
              : "Choose a new password. Min 8 characters."}
          </p>
          <SetPasswordForm />
        </div>
      </main>
    </>
  );
}
