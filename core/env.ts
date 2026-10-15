const isProd = process.env.NODE_ENV === "production";
const building = process.env.NEXT_PHASE === "phase-production-build";

function need(name: string, devFallback = "") {
  const v = process.env[name]?.trim().replace(/^([\'"])([\s\S]*)\1$/, "$2");
  if (v) return v;
  if (isProd && !building) throw new Error(`${name} must be set in production`);
  return devFallback;
}
const trim = (u: string) => u.replace(/\/$/, "");

/** Rebuilds a PEM key from however it was pasted into a hosting dashboard: with or without the
    surrounding quotes or the NAME= prefix, with real line breaks, "\\n" escapes or spaces. */
export function toPem(raw: string, kind: "PRIVATE" | "PUBLIC", name: string): string {
  let s = raw.trim().replace(/^([\'"])([\s\S]*)\1$/, "$2").replace(new RegExp(`^${name}\\s*=\\s*`), "");
  s = s.trim().replace(/^([\'"])([\s\S]*)\1$/, "$2").replace(/\\n/g, "\n");
  const other = kind === "PRIVATE" ? "PUBLIC" : "PRIVATE";
  if (s.includes(`BEGIN ${other} KEY`)) throw new Error(`${name} holds the ${other.toLowerCase()} key. Paste the ${kind.toLowerCase()} key from "npm run keys" instead.`);
  const body = s.replace(/-----(BEGIN|END)[^-]*-----/g, "").replace(/[^A-Za-z0-9+/=]/g, "");
  if (!body) return "";
  if (body.length < 60) throw new Error(`${name} is too short to be a key. Paste the whole ${kind.toLowerCase()} key from "npm run keys".`);
  return `-----BEGIN ${kind} KEY-----\n${body.match(/.{1,64}/g)!.join("\n")}\n-----END ${kind} KEY-----\n`;
}

export const env = {
  isProd,
  /** Where the portal is served (admin.nepthic.com). */
  url: trim(process.env.PORTAL_URL ?? "http://localhost:3003"),
  /** Ed25519 private key (PKCS8 PEM) that signs every request to the sites. `npm run keys` makes one. */
  privateKey: toPem(need("PORTAL_PRIVATE_KEY"), "PRIVATE", "PORTAL_PRIVATE_KEY"),
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
