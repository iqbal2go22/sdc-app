import { BrandHeader } from "@/components/BrandHeader";
import { prisma } from "@/lib/prisma";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let valid = false;
  if (token) {
    const row = await prisma.passwordResetToken.findUnique({ where: { token } });
    valid = !!row && row.usedAt === null && row.expiresAt.getTime() > Date.now();
  }

  return (
    <>
      <BrandHeader subtitle="Reset password" />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-10">
          {!token || !valid ? (
            <>
              <h1
                className="text-2xl text-siteone-gray mb-1"
                style={{ fontFamily: "var(--font-dm-serif)" }}
              >
                Link invalid
              </h1>
              <p className="text-sm text-siteone-green-gray">
                This reset link is expired or has already been used. Request a new one.
              </p>
              <a href="/forgot-password" className="btn-primary w-full mt-6 inline-block text-center">
                Request new link
              </a>
            </>
          ) : (
            <>
              <h1
                className="text-2xl text-siteone-gray mb-1"
                style={{ fontFamily: "var(--font-dm-serif)" }}
              >
                Set a new password
              </h1>
              <p className="text-sm text-siteone-green-gray mb-8">
                Choose a new password. Min 8 characters.
              </p>
              <ResetPasswordForm token={token!} />
            </>
          )}
        </div>
      </main>
    </>
  );
}
