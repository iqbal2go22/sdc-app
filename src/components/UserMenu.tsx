"use client";

import { useRouter } from "next/navigation";

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="opacity-80">{email}</span>
      <button
        type="button"
        onClick={logout}
        className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
