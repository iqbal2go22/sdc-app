"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  type: "ITEMS" | "CONTACTS" | "UOM_MASTER";
  title: string;
  description: string;
  requiredColumns: string[];
  optionalColumns: string[];
};

type UploadResponse = {
  rowCount?: number;
  insertedCount?: number;
  updatedCount?: number;
  unchangedCount?: number;
  errors?: { row: number; message: string }[];
  warnings?: { row?: number; message: string }[];
  status?: string;
  error?: string;
};

export function UploadCard({ type, title, description, requiredColumns, optionalColumns }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data: UploadResponse = await res.json();
      setResult(data);
      if (res.ok) router.refresh();
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col">
      <h3 className="font-semibold text-siteone-gray mb-1">{title}</h3>
      <p className="text-xs text-siteone-green-gray mb-4">{description}</p>

      <div className="text-xs space-y-1 mb-4">
        <div>
          <span className="font-medium text-siteone-gray">Required columns:</span>{" "}
          <span className="text-siteone-green-gray">{requiredColumns.join(", ")}</span>
        </div>
        {optionalColumns.length > 0 && (
          <div>
            <span className="font-medium text-siteone-gray">Optional:</span>{" "}
            <span className="text-siteone-green-gray">{optionalColumns.join(", ")}</span>
          </div>
        )}
      </div>

      <label className="btn-primary text-center cursor-pointer mt-auto">
        {busy ? "Uploading…" : "Choose file"}
        <input
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          disabled={busy}
          onChange={onChange}
        />
      </label>
      <p className="text-[10px] text-siteone-warm-gray mt-2 text-center">CSV or XLSX, UTF-8</p>

      {result && (
        <div className="mt-4 text-xs">
          {result.error ? (
            <div className="bg-red-50 text-[var(--red)] px-3 py-2 rounded">{result.error}</div>
          ) : (
            <div className="bg-[var(--green-light)] px-3 py-2 rounded space-y-1">
              <div>
                <strong>{result.rowCount}</strong> rows processed —{" "}
                <span className="text-siteone-green">+{result.insertedCount} new</span>,{" "}
                {result.updatedCount} updated, {result.unchangedCount} unchanged
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="text-[var(--red)]">
                  <strong>{result.errors.length} errors</strong>
                  <ul className="ml-4 list-disc">
                    {result.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>… and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
              {result.warnings && result.warnings.length > 0 && (
                <div className="text-amber-800">
                  <strong>{result.warnings.length} warnings</strong>
                  <ul className="ml-4 list-disc">
                    {result.warnings.slice(0, 5).map((w, i) => (
                      <li key={i}>
                        {w.row ? `Row ${w.row}: ` : ""}
                        {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
