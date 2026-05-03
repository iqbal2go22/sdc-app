"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RevokeContactButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!confirm(`Revoke access for ${email}? Their sessions and pending tokens will be invalidated.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/contacts/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={go} disabled={busy} className="text-xs text-[var(--red)] hover:underline disabled:opacity-50">
      {busy ? "…" : "Revoke"}
    </button>
  );
}
