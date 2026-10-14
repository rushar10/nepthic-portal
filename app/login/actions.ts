"use server";
import { redirect } from "next/navigation";
import { admins, db, eq } from "@/db";
import { checkPassword, completeSignIn, pendingAdmin, signOut } from "@/core/auth";
import { decrypt } from "@/core/crypto";
import { audit } from "@/core/audit";
import type { FormState } from "@/ui/Forms";

const field = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const r = await checkPassword(field(fd, "email"), field(fd, "password"));
  if ("error" in r) return { error: r.error };
  redirect(r.next);
}

async function landing(adminId: string) {
  const a = await db.query.admins.findFirst({ where: eq(admins.id, adminId), columns: { role: true, mustChangePassword: true } });
  if (a?.mustChangePassword) return "/login/password";
  return a?.role === "DOOR" ? "/scan" : "/";
}

export async function verifyCode(_: FormState, fd: FormData): Promise<FormState> {
  const a = await pendingAdmin();
  if (!a) redirect("/login?expired=1");
  const r = await completeSignIn(a.id, field(fd, "code"));
  if ("error" in r) return { error: r.error };
  redirect(await landing(a.id));
}

/** First sign-in: confirms the authenticator app works, which switches 2FA on for the account. */
export async function confirmSetup(_: FormState, fd: FormData): Promise<FormState> {
  const a = await pendingAdmin();
  if (!a) redirect("/login?expired=1");
  if (a.totpConfirmedAt || !a.totpSecret) redirect("/login/verify");
  const r = await completeSignIn(a.id, field(fd, "code"), decrypt(a.totpSecret));
  if ("error" in r) return { error: r.error };
  redirect(await landing(a.id));
}

export async function logout() {
  const { getAdmin } = await import("@/core/auth");
  const a = await getAdmin();
  await signOut();
  if (a) await audit({ admin: a, site: "portal", action: "logout" });
  redirect("/login");
}
