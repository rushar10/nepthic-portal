"use server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { admins, and, db, eq, ne, sessions } from "@/db";
import { hashPassword, requireAdmin } from "@/core/auth";
import { audit } from "@/core/audit";
import type { FormState } from "@/ui/Forms";

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const a = await requireAdmin({ allowDoor: true, allowPasswordChange: true });
  const current = String(fd.get("current") ?? ""), next = String(fd.get("next") ?? ""), again = String(fd.get("again") ?? "");
  const row = await db.query.admins.findFirst({ where: eq(admins.id, a.id) });
  if (!row || !(await bcrypt.compare(current, row.passwordHash))) return { error: "Your current password isn't right." };
  if (next.length < 12) return { error: "Use at least 12 characters." };
  if (next !== again) return { error: "The two new passwords don't match." };
  if (next === current) return { error: "Choose a password you haven't used here." };
  await db.update(admins).set({ passwordHash: await hashPassword(next), mustChangePassword: false }).where(eq(admins.id, a.id));
  await db.delete(sessions).where(and(eq(sessions.adminId, a.id), ne(sessions.id, a.sessionId)));
  await audit({ admin: a, site: "portal", action: "account.password_changed" });
  if (a.mustChangePassword) redirect(a.role === "DOOR" ? "/scan" : "/");
  return { ok: "Password changed. You've been signed out on your other devices." };
}

export async function signOutOthers(): Promise<FormState> {
  const a = await requireAdmin({ allowDoor: true });
  await db.delete(sessions).where(and(eq(sessions.adminId, a.id), ne(sessions.id, a.sessionId)));
  await audit({ admin: a, site: "portal", action: "account.signed_out_others" });
  return { ok: "Signed out everywhere else." };
}
