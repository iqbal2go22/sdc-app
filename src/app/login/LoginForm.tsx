"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        setSubmitting(false);
        return;
      }
      router.push(data.redirectTo ?? next ?? "/supplier");
      router.refresh();
    } catch {
      setError("Network error — try again.");
      setSubmitting(false);
    }
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
          placeholder="you@vendor.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-siteone-gray mb-1.5" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>
      {error && (
        <div className="text-sm text-[var(--red)] bg-red-50 px-3 py-2 rounded">{error}</div>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
