import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 blocks cross-origin requests to /_next/* dev resources by default.
  // Replit gives each Repl a unique subdomain like
  // <id>.<region>.replit.dev — anything other than localhost is treated as
  // cross-origin, breaking HMR and (apparently) some client-side handler binding.
  // Wildcards across the public Replit dev domain. Tighten if running multi-tenant.
  allowedDevOrigins: [
    "*.replit.dev",
    "*.repl.co",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pimassets.siteone.com" },
    ],
  },
};

export default nextConfig;
