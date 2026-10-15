/* Resets an admin's password from the command line, for when nobody who can do it in the portal
   can sign in (for example the only Super Admin forgot their password). Needs DATABASE_URL in .env:
     npm run admin:reset-password -- you@nepthic.com
   Prints a temporary password (shown once), unlocks the account and signs it out everywhere.
   At the next sign-in they choose their own password. Add --reset-2fa to also clear 2FA. */
import { db, admins, sessions, auditLog, eq, pool } from "../db";
import { hashPassword } from "../core/auth-hash";
import { tempPassword } from "../core/password";

async function main() {
  const args = process.argv.slice(2);
  const email = (args.find((a) => !a.startsWith("--")) ?? "").trim().toLowerCase();
  const reset2fa = args.includes("--reset-2fa");
  if (!email.includes("@")) throw new Error("Usage: npm run admin:reset-password -- email@nepthic.com [--reset-2fa]");
  const a = await db.query.admins.findFirst({ where: eq(admins.email, email) });
  if (!a) throw new Error(`No admin account for ${email}.`);
  const password = tempPassword();
  await db.update(admins).set({
    passwordHash: await hashPassword(password), mustChangePassword: true, failedAttempts: 0, lockedUntil: null,
    ...(reset2fa ? { totpSecret: null, totpConfirmedAt: null, totpLastStep: 0 } : {}),
  }).where(eq(admins.id, a.id));
  await db.delete(sessions).where(eq(sessions.adminId, a.id));
  await db.insert(auditLog).values({ adminId: null, adminEmail: "command line", site: "portal", action: reset2fa ? "admin.password_and_2fa_reset" : "admin.password_reset", target: email, outcome: "ok" });
  console.log(`Password reset for ${email}${reset2fa ? " (2FA cleared too)" : ""}.\nTemporary password (shown once): ${password}\nSign in at PORTAL_URL/login, then choose your own password.`);
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
