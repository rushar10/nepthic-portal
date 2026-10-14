"use server";
import { revalidatePath } from "next/cache";
import { admins, db, eq, type AdminRole } from "@/db";
import { confirmWith2fa, requireAdmin, type PortalAdmin } from "@/core/auth";
import { AdminError, ROLES, createAdmin, reset2fa, resetPassword, setDisabled, unlock, updateAccess } from "@/core/admins";
import { can } from "@/core/perms";
import { audit } from "@/core/audit";

/* Account changes. All of them are sensitive: they need the 2FA code again (valid 5 minutes).
   Super Admins can change any account. An Events site admin can only add, reset and remove
   Door / scanner staff for Events. */

export type AccountState = { error?: string; ok?: string; password?: string; email?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function guard(fd: FormData, doorOnly: boolean): Promise<{ a: PortalAdmin } | { error: string }> {
  const a = await requireAdmin();
  const allowed = a.role === "SUPER" || (doorOnly && can(a, "events", "manage"));
  if (!allowed) {
    await audit({ admin: a, site: "portal", action: "admin.change_denied", outcome: "denied" });
    return { error: "Only a Super Admin can change admin accounts." };
  }
  const problem = await confirmWith2fa(a, str(fd, "confirmCode"));
  return problem ? { error: problem } : { a };
}

/** For door-staff screens: the target must be a Door account (Events site admins can't touch anyone else). */
async function doorTarget(a: PortalAdmin, id: string) {
  if (a.role === "SUPER") return null;
  const t = await db.query.admins.findFirst({ where: eq(admins.id, id), columns: { role: true } });
  return t?.role === "DOOR" ? null : "You can only change Door / scanner staff accounts.";
}

const done = (path: string, s: AccountState): AccountState => { revalidatePath(path); return s; };
const fail = (e: unknown): AccountState => ({ error: e instanceof AdminError ? e.message : "That didn't save. Try again." });

export async function createAccount(_: AccountState, fd: FormData): Promise<AccountState> {
  const doorOnly = fd.get("_door") === "1";
  const g = await guard(fd, doorOnly);
  if ("error" in g) return g;
  const role = (doorOnly ? "DOOR" : ROLES.find((r) => r === str(fd, "role"))) as AdminRole | undefined;
  if (!role) return { error: "Pick a role." };
  try {
    const { admin, password } = await createAdmin(g.a, { name: str(fd, "name"), email: str(fd, "email"), role, sites: fd.getAll("sites").map(String) });
    return done(doorOnly ? "/events/door-staff" : "/admins", { ok: `${admin.name} can now sign in. Share the temporary password privately; they'll set up 2FA and choose a new password at first sign-in.`, password, email: admin.email });
  } catch (e) { return fail(e); }
}

export async function changeAccess(_: AccountState, fd: FormData): Promise<AccountState> {
  const g = await guard(fd, false);
  if ("error" in g) return g;
  const role = ROLES.find((r) => r === str(fd, "role"));
  if (!role) return { error: "Pick a role." };
  try { await updateAccess(g.a, str(fd, "id"), role, fd.getAll("sites").map(String)); return done("/admins", { ok: "Access updated. It applies from their next sign-in." }); }
  catch (e) { return fail(e); }
}

/** One form, several buttons: reset password, reset 2FA, unlock, remove, restore. */
export async function accountAction(_: AccountState, fd: FormData): Promise<AccountState> {
  const doorOnly = fd.get("_door") === "1";
  const g = await guard(fd, doorOnly);
  if ("error" in g) return g;
  const id = str(fd, "id");
  const path = doorOnly ? "/events/door-staff" : "/admins";
  if (doorOnly) { const bad = await doorTarget(g.a, id); if (bad) return { error: bad }; }
  try {
    switch (str(fd, "do")) {
      case "reset-password": { const r = await resetPassword(g.a, id); return done(path, { ok: "New temporary password created. They'll choose their own at next sign-in.", password: r.password, email: r.email }); }
      case "reset-2fa": await reset2fa(g.a, id); return done(path, { ok: "2FA reset. They'll set it up again at next sign-in." });
      case "unlock": await unlock(g.a, id); return done(path, { ok: "Account unlocked." });
      case "remove": await setDisabled(g.a, id, true); return done(path, { ok: "Access removed. They've been signed out everywhere." });
      case "restore": await setDisabled(g.a, id, false); return done(path, { ok: "Access restored." });
      default: return { error: "Unknown change." };
    }
  } catch (e) { return fail(e); }
}
