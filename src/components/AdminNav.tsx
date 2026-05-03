"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/uploads", label: "Uploads" },
  { href: "/admin/kickoff", label: "Kickoff" },
  { href: "/admin/uom-master", label: "UOM Master" },
  { href: "/admin/export", label: "PIM Export" },
  { href: "/admin/audit-log", label: "Audit Log" },
  { href: "/admin/wipe", label: "Wipe" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-[var(--border)] sticky top-24 z-20">
      <div className="px-9 flex items-center gap-1 overflow-x-auto">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                active
                  ? "border-siteone-green text-siteone-green"
                  : "border-transparent text-siteone-green-gray hover:text-siteone-gray",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
