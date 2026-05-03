// Reusable SiteOne-branded header for both supplier and admin shells.
// Mirrors the look from siteone-sdc-branded.html (utility bar + main nav).

import Link from "next/link";

export function BrandHeader({
  subtitle,
  rightSlot,
  variant = "supplier",
}: {
  subtitle?: string;
  rightSlot?: React.ReactNode;
  variant?: "supplier" | "admin";
}) {
  return (
    <>
      <div className="bg-siteone-green text-white sticky top-0 z-30">
        <div className="px-9 h-8 flex items-center justify-between text-[11px] font-medium tracking-wider">
          <div className="opacity-90">
            {variant === "admin" ? "Admin Console" : "Supplier Portal"}
            <span className="opacity-40 mx-3">|</span>
            Powered by SiteOne Landscape Supply
          </div>
          <div>
            <span className="bg-siteone-safety text-siteone-green px-2 py-0.5 rounded-sm uppercase tracking-wider text-[10px] font-bold">
              POC
            </span>
          </div>
        </div>
      </div>

      <header className="bg-siteone-gray text-white sticky top-8 z-30 shadow-lg">
        <div className="px-9 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="bg-siteone-green w-11 h-11 flex items-center justify-center rounded-sm">
              <svg width="44" height="44" viewBox="0 0 44 44" className="text-white">
                <text
                  x="22"
                  y="32"
                  textAnchor="middle"
                  fill="white"
                  fontFamily="DM Serif Display, serif"
                  fontSize="26"
                  fontWeight="700"
                >
                  1
                </text>
              </svg>
            </div>
            <div>
              <div className="font-serif text-2xl leading-none" style={{ fontFamily: "var(--font-dm-serif)" }}>
                SiteOne™
              </div>
              <div className="text-[9px] tracking-[0.22em] uppercase mt-0.5 opacity-65 font-medium">
                Landscape Supply
              </div>
            </div>
            {subtitle ? (
              <>
                <div className="w-px h-7 bg-white/20 mx-3" />
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  {subtitle}
                </div>
              </>
            ) : null}
          </Link>
          {rightSlot ? <div className="flex items-center gap-7">{rightSlot}</div> : null}
        </div>
      </header>
    </>
  );
}
