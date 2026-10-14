import type { AdminRole } from "@/db";
import type { SiteKey } from "./sites";

/* ---------------------------------------------------------------------------
   Roles. The same rules run in two places: here, before the portal shows a screen or calls a
   site, and again inside each site's admin API, which never trusts the portal's UI.

     SUPER       manage everything on every site; add/remove admins; audit log
     SITE_ADMIN  manage everything on the sites they're assigned to
     STAFF       day-to-day work on assigned sites: answer quotes, process orders, edit stock.
                 No approvals, refunds, payments, pricing or settings.
     DOOR        the Events ticket scanner only. No portal screens.
--------------------------------------------------------------------------- */

export type Level = "view" | "operate" | "manage" | "door";
export type Access = "manage" | "operate" | "door" | "none";
export type Who = { role: AdminRole; sites: string[] };

export function accessFor(a: Who, site: SiteKey): Access {
  if (a.role === "SUPER") return "manage";
  if (!a.sites.includes(site)) return "none";
  if (a.role === "SITE_ADMIN") return "manage";
  if (a.role === "STAFF") return "operate";
  if (a.role === "DOOR") return site === "events" ? "door" : "none";
  return "none";
}

export function allowed(access: Access, level: Level) {
  if (access === "manage") return true;
  if (access === "operate") return level !== "manage";
  if (access === "door") return level === "door";
  return false;
}

export const can = (a: Who, site: SiteKey, level: Level) => allowed(accessFor(a, site), level);

/** Sites shown in the switcher: only those this person can open in the portal. */
export const portalSites = (a: Who, all: SiteKey[]) => all.filter((s) => can(a, s, "view"));

export const isSuper = (a: Who) => a.role === "SUPER";
export const ROLE_LABEL: Record<AdminRole, string> = { SUPER: "Super Admin", SITE_ADMIN: "Site Admin", STAFF: "Staff", DOOR: "Door / scanner staff" };
