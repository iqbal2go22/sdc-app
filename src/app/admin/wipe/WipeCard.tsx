"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Impact = { label: string; count: number; scope?: string };
type Props = {
  kind: "ITEMS" | "CONTACTS" | "VENDORS";
  title: string;
  confirmPhrase: string;
  impact: Impact[];
};

export function WipeCard({ kind, title, confirmPhrase, impact }: Props) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = typed === confirmPhrase;

  async function go() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, confirm: typed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Wipe failed");
        setBusy(false);
        return;
      }
      setTyped("");
      router.refresh();
      alert(`Wipe complete. Deleted ${data.deletedCount ?? 0} rows.`);
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border-2 border-red-200">
      <h3 className="font-semibold text-siteone-gray text-lg mb-4">{title}</h3>

      <div className="bg-red-50 px-4 py-3 rounded mb-4 space-y-1 text-sm">
        <div className="font-semibold text-red-900 mb-2">This will permanently delete:</div>
        {impact.map((i, idx) => (
          <div key={idx} className="text-red-900">
            ✗ <strong>{i.count.toLocaleString()}</strong> {i.label}
            {i.scope && <span className="text-red-700 text-xs ml-1">({i.scope})</span>}
          </div>
        ))}
        <div className="text-red-900 mt-2 font-medium">This cannot be undone.</div>
      </div>

      <label className="block text-sm font-medium text-siteone-gray mb-1.5">
        Type <code className="bg-[var(--cream)] px-1.5 py-0.5 rounded font-mono">{confirmPhrase}</code> to confirm
      </label>
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className="input"
        placeholder={confirmPhrase}
        autoComplete="off"
      />

      {error && <div className="text-sm text-[var(--red)] mt-3">{error}</div>}

      <button
        type="button"
        onClick={go}
        disabled={!ready || busy}
        className="btn-danger w-full mt-4"
      >
        {busy ? "Wiping…" : ready ? title : "Type the phrase exactly to enable"}
      </button>
    </div>
  );
}
