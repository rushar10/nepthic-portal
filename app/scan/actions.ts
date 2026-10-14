"use server";
import { requireAdmin } from "@/core/auth";
import { callSite } from "@/core/ops";
import { audit } from "@/core/audit";

export type ScanResult = { state: "ok" | "warn" | "bad"; title: string; detail: string; code?: string; holder?: string; ticketType?: string };

/** One scan (or a scan queued while offline): Events validates it and admits each ticket once. */
export async function scanTicket(eventId: string, raw: string): Promise<ScanResult> {
  const a = await requireAdmin({ allowDoor: true });
  const r = await callSite<ScanResult>(a, "events", "checkin.scan", { eventId, raw: String(raw).slice(0, 500) }, { level: "door", timeoutMs: 5000 });
  if (!r.ok) {
    if (r.kind === "unavailable") throw new Error("offline"); // the scanner falls back to its offline list and queues the scan
    return { state: "bad", title: "Can't check", detail: r.error };
  }
  await audit({ admin: a, site: "events", action: `scan.${r.data.state === "ok" ? "admit" : "refused"}`, target: r.data.code ?? null, detail: { eventId, title: r.data.title } });
  return r.data;
}
