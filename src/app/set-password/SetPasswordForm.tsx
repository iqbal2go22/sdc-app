"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not set password.");
        setSubmitting(false);
        return;
      }
      router.push(data.redirectTo ?? "/supplier");
      router.refresh();
    } catch {
      setError("Network error — try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-siteone-gray mb-1.5" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-siteone-gray mb-1.5" htmlFor="confirm">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input"
        />
      </div>
      {error && (
        <div className="text-sm text-[var(--red)] bg-red-50 px-3 py-2 rounded">{error}</div>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
