import type { NextConfig } from "next";

// Replit injects REPLIT_DEV_DOMAIN with the current Repl's full hostname (e.g.
// "4f1455ef-...-worf.replit.dev"). Next 16's wildcard matcher only matches one
// subdomain label, so plain "*.replit.dev" won't cover deeper subdomains.
// Whitelist the live hostname dynamically and keep wildcards as belt-and-suspenders.
const replitHost = process.env.REPLIT_DEV_DOMAIN;
const replitOrigins = [
  ...(replitHost ? [replitHost] : []),
  "*.replit.dev",
  "*.worf.replit.dev",
  "*.picard.replit.dev",
  "*.kirk.replit.dev",
  "*.janeway.replit.dev",
  "*.repl.co",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: replitOrigins,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pimassets.siteone.com" },
    ],
  },
};

export default nextConfig;
