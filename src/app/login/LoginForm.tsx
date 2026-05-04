// Plain HTML form — submits natively to /api/auth/login, which returns a 303 redirect
// on success or back to /login?error=... on failure. No client-side JS required, so this
// works regardless of Next.js / React hydration state (Next 16 dev mode + Turbopack on
// Replit was failing to bind onSubmit handlers; this dodges that entirely).

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  return (
    <form action="/api/auth/login" method="POST" className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-siteone-gray mb-1.5" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
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
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      {next && <input type="hidden" name="next" value={next} />}
      {initialError && (
        <div className="text-sm text-[var(--red)] bg-red-50 px-3 py-2 rounded">
          {initialError}
        </div>
      )}
      <button type="submit" className="btn-primary w-full">
        Sign in
      </button>
    </form>
  );
}
