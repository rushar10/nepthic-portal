import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { aud, dateShort } from "@/ui/format";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { DEFAULT_TEMPLATE } from "@/core/ticket-design";
import { TemplateFields } from "../TemplateFields";
import { sampleQr } from "../sample";
import type { Tpl } from "../page";

export const metadata = { title: "Ticket template" };

type Ev = { id: string; name: string; startsAt: string; venue: string; city: string; ticketTypes: { name: string; priceCents: number }[] };

export default async function TemplateEditor({ params }: { params: Promise<{ id: string }> }) {
  const a = await requireSite("events");
  if (!can(a, "events", "manage")) notFound();
  const { id } = await params;
  const isNew = id === "new";
  const [r, ev] = await Promise.all([
    callSite<{ templates: Tpl[] }>(a, "events", "templates.list", {}, { level: "manage" }),
    callSite<{ events: Ev[] }>(a, "events", "events.list"),
  ]);
  const back = <Link className="btn btn-ghost btn-sm" href="/events/templates" style={{ justifySelf: "start" }}>← Ticket templates</Link>;
  if (!r.ok) return <>{back}<SiteProblem site="events" r={r} /></>;
  const t = isNew ? null : r.data.templates.find((x) => x.id === id);
  if (!isNew && !t) notFound();
  const samples = (ev.ok ? ev.data.events : []).slice(0, 8).map((e) => ({
    name: e.name, eventName: e.name, venue: e.venue, city: e.city,
    dateText: new Date(e.startsAt).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Brisbane" }).replace(/,/g, ""),
    typeName: e.ticketTypes[0]?.name ?? "General admission", priceText: aud(e.ticketTypes[0]?.priceCents ?? 4500),
  }));

  return (
    <>
      {back}
      <SectionHead site="events" title={t ? t.name : "New ticket template"} livePath={null}
        sub={t ? `Used by ${t.events} event${t.events === 1 ? "" : "s"}${t.isDefault ? " (the default)" : ""} · updated ${dateShort(t.updatedAt)}. Saving updates those tickets straight away, including ones already sold.` : "Start from a preset, then make it yours. Saved templates can be picked per event."} />
      <OpForm op="events:template.save" path={t ? `/events/templates/${t.id}` : undefined} redirectTo={t ? undefined : "/events/templates/{id}"} className="panel prox">
        {t && <input type="hidden" name="id" value={t.id} />}
        <TemplateFields initial={t ? t.design : { ...DEFAULT_TEMPLATE, name: "New template" }} qr={await sampleQr()} events={samples} isNew={isNew} />
        <div className="row">
          {!t?.isDefault && <label className="row small"><input type="checkbox" name="makeDefault" /> Make this the default for events without their own template</label>}
          <Submit pendingText="Saving…">{t ? "Save template" : "Create template"}</Submit>
        </div>
      </OpForm>
    </>
  );
}
