// Top-of-screen progress bar — mirrors the POC HTML's "X of Y items complete" treatment.
export function ProgressIndicator({
  submitted,
  total,
  vendorName,
}: {
  submitted: number;
  total: number;
  vendorName: string;
}) {
  const pct = total > 0 ? (submitted / total) * 100 : 0;
  return (
    <div className="hidden md:flex items-center gap-7">
      <div className="flex flex-col items-end gap-1">
        <div className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">
          {submitted} of {total} items complete
        </div>
        <div className="w-44 h-1.5 bg-white/15 rounded overflow-hidden">
          <div
            className="h-full bg-siteone-safety rounded transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="text-right border-l border-white/20 pl-7">
        <div className="text-sm font-semibold">{vendorName}</div>
        <div className="text-[11px] opacity-70">{total} items assigned</div>
      </div>
    </div>
  );
}
