import { auditLog, db } from "@/db";
import { clientIp } from "./net";

export type AuditEntry = {
  admin?: { id: string; email: string } | null;
  email?: string;
  site: "portal" | "clothing" | "wholesale" | "events";
  action: string;
  target?: string | null;
  detail?: unknown;
  outcome?: "ok" | "denied" | "failed";
};

/** Records an admin action. Never throws: a logging hiccup must not break the action itself. */
export async function audit(e: AuditEntry) {
  try {
    await db.insert(auditLog).values({
      adminId: e.admin?.id ?? null,
      adminEmail: e.admin?.email ?? e.email ?? "unknown",
      site: e.site, action: e.action, target: e.target ?? null,
      detail: (e.detail ?? null) as object | null,
      ip: await clientIp().catch(() => null),
      outcome: e.outcome ?? "ok",
    });
  } catch (err) {
    console.error("[audit] could not write", err);
  }
}
