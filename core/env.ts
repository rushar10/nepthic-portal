const isProd = process.env.NODE_ENV === "production";
const building = process.env.NEXT_PHASE === "phase-production-build";

function need(name: string, devFallback = "") {
  const v = process.env[name]?.trim().replace(/^([\'"])([\s\S]*)\1$/, "$2");
  if (v) return v;
  if (isProd && !building) throw new Error(`${name} must be set in production`);
  return devFallback;
}
const trim = (u: string) => u.replace(/\/$/, "");

export const env = {
  isProd,
  /** Where the portal is served (admin.nepthic.com). */
  url: trim(process.env.PORTAL_URL ?? "http://localhost:3003"),
  /** Ed25519 private key (PKCS8 PEM) that signs every request to the sites. `npm run keys` makes one. */
  privateKey: need("PORTAL_PRIVATE_KEY").replace(/\\n/g, "\n"),
  /** 32-byte key (base64) that encrypts 2FA secrets at rest. */
  encryptionKey: need("PORTAL_ENCRYPTION_KEY"),
  /** Minutes of inactivity before a session ends, and the longest a session can last. */
  idleMinutes: Number(process.env.PORTAL_IDLE_MINUTES ?? 30),
  /** Two-factor sign-in. On unless PORTAL_REQUIRE_2FA is "false". When off, admins sign in with
      email + password only, and sensitive actions ask for the password again instead of a code.
      Switch it back on before going live. */
  require2fa: (process.env.PORTAL_REQUIRE_2FA ?? "true").toLowerCase() !== "false",
  maxSessionHours: Number(process.env.PORTAL_MAX_SESSION_HOURS ?? 12),
  /** Optional IP allowlist: comma-separated IPs or IPv4 CIDRs. Empty = off. */
  ipAllowlist: (process.env.PORTAL_IP_ALLOWLIST ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  /** Each site's public address and admin API base. An empty API URL means "not connected". */
  sites: {
    clothing: { url: trim(process.env.CLOTHING_URL ?? "https://www.nepthic.com"), api: trim(process.env.CLOTHING_API_URL ?? "") },
    wholesale: { url: trim(process.env.WHOLESALE_URL ?? "http://localhost:3001"), api: trim(process.env.WHOLESALE_API_URL ?? process.env.WHOLESALE_URL ?? "http://localhost:3001") },
    events: { url: trim(process.env.EVENTS_URL ?? "http://localhost:3002"), api: trim(process.env.EVENTS_API_URL ?? process.env.EVENTS_URL ?? "http://localhost:3002") },
  },
};
