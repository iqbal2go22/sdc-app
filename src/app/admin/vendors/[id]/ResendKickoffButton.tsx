"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResendKickoffButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  async function go() {
    if (!confirm("Generate a fresh kickoff link for this contact?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/kickoff/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setUrl(data.url);
        router.refresh();
      } else {
        alert(data.error ?? "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  if (url) {
    return (
      <div className="text-xs">
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(url).then(() => alert("Copied"))}
          className="text-siteone-blue hover:underline"
        >
          Copy URL
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={go} disabled={busy} className="text-xs text-siteone-blue hover:underline disabled:opacity-50">
      {busy ? "…" : "Resend kickoff"}
    </button>
  );
}
