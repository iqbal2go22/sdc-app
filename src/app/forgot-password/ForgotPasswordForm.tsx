"use client";

import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      // POC: server returns the reset URL inline so we can demo without SMTP wiring.
      // Production would email this and just say "check your inbox."
      setResetLink(data.devResetUrl ?? null);
      setSubmitted(true);
    } catch {
      setSubmitted(true); // still show generic confirmation
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-siteone-gray bg-[var(--green-light)] px-4 py-3 rounded">
          If that email is on our allowlist, a reset link is on its way.
        </div>
        {resetLink && (
          <div className="text-xs bg-amber-50 border border-amber-200 px-4 py-3 rounded">
            <div className="font-semibold text-amber-900 mb-1">POC mode: reset link</div>
            <div className="break-all">
              <a href={resetLink} className="text-siteone-blue underline">
                {resetLink}
              </a>
            </div>
            <div className="text-amber-800 mt-2">
              In production this would be emailed and not shown here.
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-siteone-gray mb-1.5" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </div>
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
