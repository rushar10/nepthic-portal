import { getAdmin } from "@/core/auth";
import { callSite } from "@/core/ops";

export const dynamic = "force-dynamic";

/** Ticket list for one event, so the scanner keeps working if the venue's signal drops. */
export async function GET(req: Request) {
  const a = await getAdmin();
  if (!a) return new Response("Not found", { status: 404 });
  const eventId = new URL(req.url).searchParams.get("event") ?? "";
  const r = await callSite(a, "events", "checkin.tickets", { eventId }, { level: "door", timeoutMs: 8000 });
  if (!r.ok) return Response.json({ error: r.error }, { status: r.kind === "unavailable" ? 503 : 403 });
  return Response.json(r.data, { headers: { "cache-control": "no-store" } });
}
