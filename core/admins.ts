import { admins, and, count, db, eq, isNull, ne, sessions, type AdminRole } from "@/db";
import { type PortalAdmin } from "./auth";
import { hashPassword } from "./auth-hash";
import { tempPassword } from "./password";
export { tempPassword };
import { audit } from "./audit";
import { SITE_KEYS } from "./sites";

/* Creating and changing portal accounts. Only Super Admins manage admins; Events site admins
   may also add and remove Door / scanner staff for Events. There is no public sign-up. */

export const ROLES: AdminRole[] = ["SUPER", "SITE_ADMIN", "STAFF", "DOOR", "PARTNER"];
const cleanSites = (role: AdminRole, sites: string[]) =>
  role === "SUPER" ? [] : role === "DOOR" || role === "PARTNER" ? ["events"] : [...new Set(sites.filter((s) => (SITE_KEYS as string[]).includes(s)))];

export class AdminError extends Error {}

const cleanPartner = (role: AdminRole, code?: string | null) => (role === "PARTNER" ? String(code ?? "").trim().toUpperCase() || null : null);

export async function createAdmin(by: PortalAdmin, v: { name: string; email: string; role: AdminRole; sites: string[]; partnerCode?: string | null }) {
  const email = v.email.trim().toLowerCase();
  const name = v.name.trim();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AdminError("Add a name and a valid email.");
  if (!ROLES.includes(v.role)) throw new AdminError("Pick a role.");
  const sites = cleanSites(v.role, v.sites);
  if ((v.role === "SITE_ADMIN" || v.role === "STAFF") && !sites.length) throw new AdminError("Pick at least one site for this role.");
  const partnerCode = cleanPartner(v.role, v.partnerCode);
  if (v.role === "PARTNER" && !partnerCode) throw new AdminError("Pick which partner this login belongs to.");
  if (await db.query.admins.findFirst({ where: eq(admins.email, email) })) throw new AdminError("There's already an admin account with that email.");
  const password = tempPassword();
  const [a] = await db.insert(admins).values({ name, email, role: v.role, sites, partnerCode, passwordHash: await hashPassword(password), mustChangePassword: true, createdById: by.id }).returning();
  await audit({ admin: by, site: "portal", action: "admin.created", target: email, detail: { role: v.role, sites, partnerCode } });
  return { admin: a, password };
}

async function target(id: string) {
  const a = await db.query.admins.findFirst({ where: eq(admins.id, id) });
  if (!a) throw new AdminError("That account doesn't exist.");
  return a;
}

async function otherActiveSupers(exceptId: string) {
  const [{ n }] = await db.select({ n: count() }).from(admins).where(and(eq(admins.role, "SUPER"), isNull(admins.disabledAt), ne(admins.id, exceptId)));
  return n;
}

export async function updateAccess(by: PortalAdmin, id: string, role: AdminRole, sites: string[], partnerCodeIn?: string | null) {
  if (id === by.id) throw new AdminError("You can't change your own role. Ask another Super Admin.");
  const a = await target(id);
  if (!ROLES.includes(role)) throw new AdminError("Pick a role.");
  if (a.role === "SUPER" && role !== "SUPER" && (await otherActiveSupers(id)) === 0) throw new AdminError("Keep at least one active Super Admin.");
  const clean = cleanSites(role, sites);
  if ((role === "SITE_ADMIN" || role === "STAFF") && !clean.length) throw new AdminError("Pick at least one site for this role.");
  const partnerCode = cleanPartner(role, partnerCodeIn ?? a.partnerCode);
  if (role === "PARTNER" && !partnerCode) throw new AdminError("Pick which partner this login belongs to.");
  await db.update(admins).set({ role, sites: clean, partnerCode }).where(eq(admins.id, id));
  await db.delete(sessions).where(eq(sessions.adminId, id)); // new access applies from their next sign-in
  await audit({ admin: by, site: "portal", action: "admin.access_changed", target: a.email, detail: { from: { role: a.role, sites: a.sites }, to: { role, sites: clean } } });
}

export async function resetPassword(by: PortalAdmin, id: string) {
  const a = await target(id);
  const password = tempPassword();
  await db.update(admins).set({ passwordHash: await hashPassword(password), mustChangePassword: true, failedAttempts: 0, lockedUntil: null }).where(eq(admins.id, id));
  await db.delete(sessions).where(eq(sessions.adminId, id));
  await audit({ admin: by, site: "portal", action: "admin.password_reset", target: a.email });
  return { email: a.email, password };
}

export async function reset2fa(by: PortalAdmin, id: string) {
  const a = await target(id);
  await db.update(admins).set({ totpSecret: null, totpConfirmedAt: null, totpLastStep: 0 }).where(eq(admins.id, id));
  await db.delete(sessions).where(eq(sessions.adminId, id));
  await audit({ admin: by, site: "portal", action: "admin.2fa_reset", target: a.email });
}

export async function unlock(by: PortalAdmin, id: string) {
  const a = await target(id);
  await db.update(admins).set({ failedAttempts: 0, lockedUntil: null }).where(eq(admins.id, id));
  await audit({ admin: by, site: "portal", action: "admin.unlocked", target: a.email });
}

export async function setDisabled(by: PortalAdmin, id: string, disabled: boolean) {
  if (id === by.id) throw new AdminError("You can't remove your own access.");
  const a = await target(id);
  if (disabled && a.role === "SUPER" && (await otherActiveSupers(id)) === 0) throw new AdminError("Keep at least one active Super Admin.");
  await db.update(admins).set({ disabledAt: disabled ? new Date() : null }).where(eq(admins.id, id));
  if (disabled) await db.delete(sessions).where(eq(sessions.adminId, id));
  await audit({ admin: by, site: "portal", action: disabled ? "admin.removed" : "admin.restored", target: a.email });
}
