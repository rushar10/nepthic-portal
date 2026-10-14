/* Local development only: one account per role so every screen can be tried.
   Writes their 2FA secrets to .dev-accounts.json (git-ignored) for the automated tests.
   Refuses to run in production. */
import fs from "node:fs";
import { db, admins, eq, pool, type AdminRole } from "../db";
import { hashPassword } from "../core/auth-hash";
import { encrypt } from "../core/crypto";
import { newSecret } from "../core/totp";

const PEOPLE: { name: string; email: string; role: AdminRole; sites: string[]; with2fa: boolean }[] = [
  { name: "Ava Owner", email: "owner@nepthic.com", role: "SUPER", sites: [], with2fa: true },
  { name: "Will Wholesale", email: "wholesale-admin@nepthic.com", role: "SITE_ADMIN", sites: ["wholesale"], with2fa: true },
  { name: "Eve Events", email: "events-admin@nepthic.com", role: "SITE_ADMIN", sites: ["events"], with2fa: true },
  { name: "Sam Staff", email: "staff@nepthic.com", role: "STAFF", sites: ["wholesale", "events"], with2fa: true },
  { name: "Dan Door", email: "door@nepthic.com", role: "DOOR", sites: ["events"], with2fa: true },
  { name: "Nina New", email: "new-admin@nepthic.com", role: "STAFF", sites: ["wholesale"], with2fa: false },
];

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("seed-dev is for local development only.");
  const out: Record<string, { password: string; secret: string | null; role: string }> = {};
  for (const p of PEOPLE) {
    const password = "demo-password-123";
    const secret = p.with2fa ? newSecret() : null;
    const values = { name: p.name, role: p.role, sites: p.sites, passwordHash: await hashPassword(password), mustChangePassword: false,
      totpSecret: secret ? encrypt(secret) : null, totpConfirmedAt: secret ? new Date() : null, totpLastStep: 0, failedAttempts: 0, lockedUntil: null, disabledAt: null };
    const existing = await db.query.admins.findFirst({ where: eq(admins.email, p.email) });
    if (existing) await db.update(admins).set(values).where(eq(admins.id, existing.id));
    else await db.insert(admins).values({ email: p.email, ...values });
    out[p.email] = { password, secret, role: p.role };
  }
  fs.writeFileSync(".dev-accounts.json", JSON.stringify(out, null, 2));
  console.log(`Dev accounts ready (password demo-password-123). 2FA secrets in .dev-accounts.json.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
