import { getAdmin } from "@/core/auth";
import { signFor } from "@/core/ops";
import { can } from "@/core/perms";
import { env } from "@/core/env";
import { audit } from "@/core/audit";
import { admins, db } from "@/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/* Downloads from Events (print-ready ticket PDFs, ticket lists, partner reports), fetched with
   the portal's signed token and passed straight to the admin's browser.
   ?kind=batch|tickets|batch-csv|report and the same parameters Events takes. */
const KINDS = new Set(["batch", "tickets", "batch-csv", "report", "scans"]);

export async function GET(req: Request) {
  const a = await getAdmin();
  const u = new URL(req.url);
  if (!a || !can(a, "events", "view") || !KINDS.has(u.searchParams.get("kind") ?? "") || !env.sites.events.api) return new Response("Not found", { status: 404 });
  const q = new URLSearchParams();
  for (const k of ["kind", "id", "ids", "layout", "eventId", "format", "partnerId", "gate", "result", "method", "q"]) { const v = u.searchParams.get(k); if (v) q.set(k, v.slice(0, 80000)); }
  let res: Response;
  try {
    res = await fetch(`${env.sites.events.api}/api/ops/v1/export?${q}`, { headers: { authorization: `Bearer ${await signFor(a, "events")}` }, cache: "no-store", signal: AbortSignal.timeout(110000) });
  } catch {
    return new Response("Events isn't answering right now. Try again in a moment.", { status: 503 });
  }
  if (!res.ok) return new Response("Not found", { status: 404 });
  await audit({ admin: a, site: "events", action: "export.downloaded", target: q.get("id") ?? q.get("eventId") ?? null, detail: { kind: q.get("kind"), layout: q.get("layout"), format: q.get("format") } });
  if (q.get("kind") === "scans") {
    // The door log records portal account ids; the CSV shows who that was.
    const people = new Map((await db.select({ id: admins.id, name: admins.name, email: admins.email }).from(admins)).map((x) => [`portal:${x.id}`, `${x.name} <${x.email}>`]));
    const text = (await res.text()).replace(/portal:[A-Za-z0-9-]+/g, (m) => people.get(m) ?? "Unknown or removed account");
    return new Response(text, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": res.headers.get("content-disposition") ?? "attachment", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  }
  return new Response(res.body, { headers: {
    "content-type": res.headers.get("content-type") ?? "application/octet-stream",
    "content-disposition": res.headers.get("content-disposition") ?? "attachment",
    "cache-control": "private, no-store", "x-content-type-options": "nosniff",
  } });
}
