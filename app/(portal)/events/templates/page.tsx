import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { dateShort } from "@/ui/format";
import { OpForm } from "@/components/OpForm";
import { QuickOp } from "@/components/QuickOp";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { Submit } from "@/ui/Forms";
import { SAMPLE_DATA, ticketSvg, type TicketTemplate } from "@/core/ticket-design";
import { sampleQr } from "./sample";

export const metadata = { title: "Ticket templates" };

export type Tpl = { id: string; name: string; design: TicketTemplate; isDefault: boolean; updatedAt: string; events: number };

/* Ticket designs for Events. Each event uses one (or the default); customers see it in My Tickets
   and in the downloaded ticket. */
export default async function Templates() {
  const a = await requireSite("events");
  if (!can(a, "events", "manage")) notFound();
  const r = await callSite<{ templates: Tpl[]; defaultId: string }>(a, "events", "templates.list", {}, { level: "manage" });
  const head = (
    <SectionHead site="events" title="Ticket templates" livePath="/tickets" sub="How tickets look in My Tickets and when downloaded. Pick one per event when you edit it; events without one use the default.">
      <Link className="btn btn-primary btn-sm prox" href="/events/templates/new">New template</Link>
    </SectionHead>
  );
  if (!r.ok) return <>{head}<SiteProblem site="events" r={r} /></>;
  const qr = await sampleQr();
  const path = "/events/templates";

  return (
    <>
      {head}
      <div className="tpl-grid">
        {r.data.templates.map((t) => (
          <article key={t.id} className="card prox tpl-card" id={t.id}>
            <Link href={`/events/templates/${t.id}`} className="tpl-thumb" aria-label={`Edit ${t.name}`} dangerouslySetInnerHTML={{ __html: ticketSvg(t.design, SAMPLE_DATA, qr, { title: `${t.name} preview`, art: (id) => `/files/events/${id}` }) }} />
            <div className="spread">
              <div><b>{t.name}</b> <span className="dim small">· updated {dateShort(t.updatedAt)}</span></div>
              <div className="row">
                {t.isDefault && <span className="pill ok">Default</span>}
                <span className="pill">{t.events} event{t.events === 1 ? "" : "s"}</span>
              </div>
            </div>
            <div className="row">
              <Link className="btn btn-sm prox" href={`/events/templates/${t.id}`}>Edit</Link>
              {!t.isDefault && <QuickOp op="events:template.default" fields={{ id: t.id }} done="Now the default" path={path} className="btn btn-sm btn-ghost">Make default</QuickOp>}
              {!t.isDefault && (
                <OpForm op="events:template.delete" path={path} className="row">
                  <input type="hidden" name="id" value={t.id} />
                  <Submit className="btn btn-sm btn-ghost" pendingText="Deleting…">Delete</Submit>
                </OpForm>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
