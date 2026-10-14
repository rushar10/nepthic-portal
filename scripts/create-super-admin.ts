/* Creates the first Super Admin (there is no sign-up). Run once on a new install:
     npm run admin:create -- "Your Name" you@nepthic.com
   Prints a temporary password. At first sign-in you set up 2FA and choose your own password. */
import { db, admins, eq, pool } from "../db";
import { hashPassword } from "../core/auth-hash";
import { tempPassword } from "../core/password";

async function main() {
  const [name, emailIn] = process.argv.slice(2);
  const email = (emailIn ?? "").trim().toLowerCase();
  if (!name || !email.includes("@")) throw new Error('Usage: npm run admin:create -- "Full Name" email@nepthic.com');
  if (await db.query.admins.findFirst({ where: eq(admins.email, email) })) throw new Error(`${email} already has an account.`);
  const password = tempPassword();
  await db.insert(admins).values({ name, email, role: "SUPER", sites: [], passwordHash: await hashPassword(password), mustChangePassword: true });
  console.log(`Super Admin created: ${email}\nTemporary password (shown once): ${password}\nSign in at PORTAL_URL/login, set up 2FA, then choose your own password.`);
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
