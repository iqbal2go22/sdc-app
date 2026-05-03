import { BrandHeader } from "@/components/BrandHeader";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <>
      <BrandHeader subtitle="Forgot password" />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-10">
          <h1
            className="text-2xl text-siteone-gray mb-1"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            Reset your password
          </h1>
          <p className="text-sm text-siteone-green-gray mb-8">
            Enter the email associated with your account. If it&apos;s on the allowlist, you&apos;ll
            receive a one-time reset link.
          </p>
          <ForgotPasswordForm />
        </div>
      </main>
    </>
  );
}
