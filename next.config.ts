import type { NextConfig } from "next";

/* Nepthic Admin Portal: a standalone project on its own domain (admin.nepthic.com). It has its
   own database and accounts and shares nothing at runtime with the customer sites. */
const securityHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https: http://localhost:*" },
];

const config: NextConfig = {
  poweredByHeader: false,
  // Event covers and gallery photos go through server actions.
  experimental: { serverActions: { bodySizeLimit: "32mb" } },
  async headers() {
    return [{ source: "/:path*", headers: [...securityHeaders, { key: "Cache-Control", value: "no-store" }] }];
  },
};

export default config;
