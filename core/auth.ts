import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { admins, and, db, eq, gte, loginAttempts, sessions, count, lt, type AdminRole } from "@/db";
import { env } from "./env";
import { decrypt, randomToken, sha256 } from "./crypto";
import { verifyCode } from "./totp";
import { clientIp, userAgent } from "./net";
import { audit } from "./audit";
import { can, type Level } from "./perms";
import type { SiteKey } from "./sites";

/* ---------------------------------------------------------------------------
   Portal sign-in. Admin accounts live only in the portal's own database; customer accounts
   from the sites can never sign in here (they don't exist here).

   1. Email + password  → a short "password" session (10 minutes) that can do nothing except
      enter a 2FA code. Wrong passwords count towards a lock: 5 in a row locks the account for
      15 minutes; more than 30 attempts from one IP in 15 minutes are refused outright.
   2. 2FA code (or first-time 2FA setup) → a fresh "active" session with a new cookie value.
   3. Active sessions end after PORTAL_IDLE_MINUTES of inactivity (30 by default) and after
      PORTAL_MAX_SESSION_HOURS at most. The cookie is httpOnly, Secure, SameSite=Strict and
      host-only (the __Host- prefix in production).
--------------------------------------------------------------------------- */

export const COOKIE = env.isProd ? "__Host-nep_portal" : "nep_portal";
const PENDING_MINUTES = 10;
const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;
const IP_LIMIT = 30;
const REAUTH_MINUTES = 5;

export { hashPassword } from "./auth-hash";
let dummy: string | undefined;

async function setCookie(value: string, expires: Date) {
  (await cookies()).set(COOKIE, value, { httpOnly: true, secure: env.isProd, sameSite: "strict", path: "/", expires });
}

async function newSession(adminId: string, stage: "password" | "active") {
  const raw = randomToken();
  const expiresAt = new Date(Date.now() + (stage === "active" ? env.maxSessionHours * 3600e3 : PENDING_MINUTES * 60e3));
  await db.insert(sessions).values({ id: sha256(raw), adminId, stage, expiresAt, ip: await clientIp(), userAgent: await userAgent() });
  await setCookie(raw, expiresAt);
}

export async function signOut() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw) await db.delete(sessions).where(eq(sessions.id, sha256(raw)));
  jar.set(COOKIE, "", { path: "/", expires: new Date(0), secure: env.isProd, httpOnly: true, sameSite: "strict" });
}

/** Step 1. Returns a message for the form, or where to go next. */
export async function checkPassword(emailIn: string, password: string): Promise<{ error: string } | { next: "/login/verify" | "/login/setup" }> {
  const email = emailIn.trim().toLowerCase();
  const ip = await clientIp();
  const since = new Date(Date.now() - LOCK_MINUTES * 60e3);
  const [{ n }] = await db.select({ n: count() }).from(loginAttempts).where(and(eq(loginAttempts.ip, ip), gte(loginAttempts.at, since)));
  if (n >= IP_LIMIT) {
    await audit({ email, site: "portal", action: "login.rate_limited", outcome: "denied", detail: { ip } });
    return { error: "Too many sign-in attempts from this network. Wait 15 minutes and try again." };
  }

  const a = await db.query.admins.findFirst({ where: eq(admins.email, email) });
  dummy ??= await bcrypt.hash("not-a-real-password", 12);
  const ok = await bcrypt.compare(password, a?.passwordHash ?? dummy); // same timing whether or not the account exists
  await db.insert(loginAttempts).values({ ip, email, ok: ok && !!a });
  await db.delete(loginAttempts).where(lt(loginAttempts.at, new Date(Date.now() - 7 * 864e5)));

  const generic = { error: "That email and password don't match an admin account." };
  if (!a) { await audit({ email, site: "portal", action: "login.failed", outcome: "failed", detail: { reason: "no such admin" } }); return generic; }
  if (a.disabledAt) { await audit({ admin: a, site: "portal", action: "login.failed", outcome: "denied", detail: { reason: "disabled" } }); return generic; }
  if (a.lockedUntil && a.lockedUntil > new Date()) {
    await audit({ admin: a, site: "portal", action: "login.failed", outcome: "denied", detail: { reason: "locked" } });
    return { error: `This account is locked after too many attempts. Try again after ${a.lockedUntil.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" })}, or ask a Super Admin to unlock it.` };
  }
  if (!ok) { await failed(a.id, a.email, a.failedAttempts, "password"); return generic; }

  await newSession(a.id, "password");
  return { next: a.totpConfirmedAt ? "/login/verify" : "/login/setup" };
}

async function failed(id: string, email: string, before: number, what: "password" | "2fa") {
  const attempts = before + 1;
  const lock = attempts >= LOCK_AFTER;
  await db.update(admins).set({ failedAttempts: attempts, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60e3) : null }).where(eq(admins.id, id));
  await audit({ admin: { id, email }, site: "portal", action: lock ? "login.locked" : `login.failed`, outcome: "failed", detail: { reason: what, attempts } });
  if (lock) await db.delete(sessions).where(eq(sessions.adminId, id));
}

/** The half-signed-in person between password and 2FA, or null. */
export async function pendingAdmin() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const s = await db.query.sessions.findFirst({ where: eq(sessions.id, sha256(raw)), with: { admin: true } });
  if (!s || s.stage !== "password" || s.expiresAt < new Date() || s.admin.disabledAt) return null;
  return s.admin;
}

/** Step 2: check a code, and on success swap the pending session for an active one. */
export async function completeSignIn(adminId: string, code: string, secretOverride?: string): Promise<{ error: string } | { ok: true }> {
  const a = await db.query.admins.findFirst({ where: eq(admins.id, adminId) });
  if (!a || a.disabledAt) return { error: "Start again: sign in with your email and password." };
  if (a.lockedUntil && a.lockedUntil > new Date()) return { error: "This account is locked after too many attempts. Try again in 15 minutes." };
  const secret = secretOverride ?? (a.totpSecret ? decrypt(a.totpSecret) : null);
  if (!secret) return { error: "Set up two-factor authentication first." };
  const step = verifyCode(secret, code, a.totpLastStep);
  if (step == null) { await failed(a.id, a.email, a.failedAttempts, "2fa"); return { error: "That code didn't work. Codes change every 30 seconds; use the newest one." }; }

  await db.update(admins).set({ totpLastStep: step, failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), ...(secretOverride ? { totpConfirmedAt: new Date() } : {}) }).where(eq(admins.id, a.id));
  // New cookie value for the signed-in session (the pending one is thrown away).
  const raw = (await cookies()).get(COOKIE)?.value;
  if (raw) await db.delete(sessions).where(eq(sessions.id, sha256(raw)));
  await newSession(a.id, "active");
  if (secretOverride) await audit({ admin: a, site: "portal", action: "2fa.enabled" });
  await audit({ admin: a, site: "portal", action: "login.ok" });
  return { ok: true };
}

export type PortalAdmin = { id: string; email: string; name: string; role: AdminRole; sites: string[]; mustChangePassword: boolean; reauthUntil: Date | null; sessionId: string };

/** The signed-in admin for this request, or null. Applies the idle timeout. */
export const getAdmin = cache(async (): Promise<PortalAdmin | null> => {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const id = sha256(raw);
  const s = await db.query.sessions.findFirst({ where: eq(sessions.id, id), with: { admin: true } });
  const now = Date.now();
  if (!s || s.stage !== "active" || s.expiresAt.getTime() < now || s.admin.disabledAt) return null;
  if (now - s.lastSeenAt.getTime() > env.idleMinutes * 60e3) {
    await db.delete(sessions).where(eq(sessions.id, id));
    await audit({ admin: s.admin, site: "portal", action: "session.timed_out" });
    return null;
  }
  if (now - s.lastSeenAt.getTime() > 30e3) await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
  const a = s.admin;
  return {
    id: a.id, email: a.email, name: a.name, role: a.role, sites: a.sites, mustChangePassword: a.mustChangePassword, sessionId: id,
    reauthUntil: s.reauthAt ? new Date(s.reauthAt.getTime() + REAUTH_MINUTES * 60e3) : null,
  };
});

/** Page guard. Not signed in → login screen. Door staff → the scanner (they have no portal screens). */
export async function requireAdmin(opts: { allowDoor?: boolean; allowPasswordChange?: boolean } = {}) {
  const a = await getAdmin();
  if (!a) redirect("/login");
  if (a.role === "DOOR" && !opts.allowDoor) redirect("/scan");
  if (a.mustChangePassword && !opts.allowPasswordChange) redirect("/login/password");
  return a;
}

/** Page guard for a site section: shows a 404 if this person can't open that site at that level. */
export async function requireSite(site: SiteKey, level: Level = "view") {
  const a = await requireAdmin();
  if (!can(a, site, level)) notFound();
  return a;
}

export async function requireSuper() {
  const a = await requireAdmin();
  if (a.role !== "SUPER") notFound();
  return a;
}

export const recentlyConfirmed = (a: PortalAdmin) => !!a.reauthUntil && a.reauthUntil > new Date();

/** Sensitive actions (refunds, payment terms, removing things, admin accounts) need the 2FA code
    again, unless it was entered in the last 5 minutes. Returns an error message, or null if OK. */
export async function confirmWith2fa(a: PortalAdmin, code: string): Promise<string | null> {
  if (recentlyConfirmed(a)) return null;
  if (!code) return "Enter your 2FA code to confirm this.";
  const row = await db.query.admins.findFirst({ where: eq(admins.id, a.id) });
  if (!row?.totpSecret) return "Two-factor authentication isn't set up on this account.";
  const step = verifyCode(decrypt(row.totpSecret), code, row.totpLastStep);
  if (step == null) {
    await audit({ admin: a, site: "portal", action: "reauth.failed", outcome: "failed" });
    return "That 2FA code didn't work. Use the newest one from your authenticator app.";
  }
  await db.update(admins).set({ totpLastStep: step }).where(eq(admins.id, a.id));
  await db.update(sessions).set({ reauthAt: new Date() }).where(eq(sessions.id, a.sessionId));
  return null;
}
