import Link from "next/link";
import { recentlyConfirmed, requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { aud, aud0, dateLong, time } from "@/ui/format";
import { Status } from "@/ui/Status";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { EventForm, type TemplateOption } from "../EventForm";

export const metadata = { title: "Event" };

type T = { id: string; name: string; priceCents: number; capacity: number; sold: number };
type D = {
  event: { id: string; slug: string; name: string; description: string; venue: string; address: string; city: string; startsAt: string; ageRestriction: string; hue: number; ticketTemplateId: string | null; status: "DRAFT" | "PUBLISHED" | "CANCELLED"; galleryIds: string[]; ticketTypes: T[] };
  attendees: { id: string; code: string; holderName: string; status: string; checkedInAt: string | null; ticketType: { name: string; priceCents: number }; ticketOrder: { buyerEmail: string } | null; buyerEmail?: string | null }[];
};

export default async function EventDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const a = await requireSite("events");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const r = await callSite<D>(a, "events", "event.get", { id });
  if (!r.ok) return <><Link className="btn btn-ghost btn-sm" href="/events/events" style={{ justifySelf: "start" }}>← Events</Link><SiteProblem site="events" r={r} /></>;
  const { event: e, attendees } = r.data;
  const manage = can(a, "events", "manage");
  const tpl = manage ? await callSite<{ templates: TemplateOption[] }>(a, "events", "templates.list", {}, { level: "manage" }) : null;
  const confirmed = recentlyConfirmed(a);
  const path = `/events/events/${e.id}`;
  const used = attendees.filter((t) => t.status === "USED").length;
  const live = attendees.filter((t) => t.status === "VALID" || t.status === "USED" || t.status === "REFUND_REQUESTED").length;

  return (
    <>
      <Link className="btn btn-ghost btn-sm" href="/events/events" style={{ justifySelf: "start" }}>← Events</Link>
      {sp.created && <p className="note ok">Event created{e.status === "DRAFT" ? " as a draft. Set it to Published when you're ready to sell." : " and on sale."}</p>}
      <SectionHead site="events" title={e.name} sub={`${dateLong(e.startsAt)} · ${time(e.startsAt)} · ${e.venue}`} livePath={e.status === "PUBLISHED" ? `/e/${e.slug}` : null}>
        <Status value={e.status} />
      </SectionHead>

      <div className="kpis">
        <div className="kpi prox"><span className="l">Tickets issued</span><span className="v">{live}</span></div>
        <div className="kpi prox"><span className="l">Checked in</span><span className="v">{used}</span><span className="small dim">{live ? Math.round((used / live) * 100) : 0}% of issued</span></div>
        <div className="kpi prox"><span className="l">Gross</span><span className="v">{aud0(e.ticketTypes.reduce((n, t) => n + t.sold * t.priceCents, 0))}</span></div>
      </div>

      <section className="panel prox">
        <h2 className="h3">Ticket types and capacity</h2>
        <div className="cards">
          {e.ticketTypes.map((t) => (
            <OpForm key={t.id} op="events:ticketType.save" path={path} className="row">
              <input type="hidden" name="typeId" value={t.id} /><input type="hidden" name="eventId" value={e.id} />
              <label className="f" style={{ flex: 2, minWidth: 180 }}>Name<input type="text" name="name" defaultValue={t.name} disabled={!manage} /></label>
              <label className="f" style={{ width: 120 }}>Price ($)<input type="number" name="price" step="0.01" defaultValue={(t.priceCents / 100).toFixed(2)} disabled={!manage} /></label>
              <label className="f" style={{ width: 110 }}>Capacity<input type="number" name="capacity" min={t.sold} defaultValue={t.capacity} disabled={!manage} /></label>
              <span className="small dim" style={{ alignSelf: "end", paddingBottom: 10 }}>{t.sold} sold</span>
              {manage && <span style={{ alignSelf: "end" }}><Submit className="btn btn-sm prox" pendingText="Saving…">Save</Submit></span>}
            </OpForm>
          ))}
          {manage && (
            <OpForm op="events:ticketType.save" path={path} className="row">
              <input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="sortOrder" value={e.ticketTypes.length} />
              <label className="f" style={{ flex: 2, minWidth: 180 }}>New type<input type="text" name="name" placeholder="e.g. Final release" /></label>
              <label className="f" style={{ width: 120 }}>Price ($)<input type="number" name="price" step="0.01" min="0" /></label>
              <label className="f" style={{ width: 110 }}>Capacity<input type="number" name="capacity" min="1" /></label>
              <span style={{ alignSelf: "end" }}><Submit className="btn btn-sm prox" pendingText="Adding…">Add</Submit></span>
            </OpForm>
          )}
        </div>
      </section>

      {manage && <EventForm event={e} confirmed={confirmed} templates={tpl?.ok ? tpl.data.templates : []} />}

      {e.galleryIds.length > 0 && (
        <section className="panel prox">
          <h2 className="h3">Gallery</h2>
          <div className="thumbs">
            {e.galleryIds.map((g) => (
              <figure key={g} style={{ margin: 0, display: "grid", gap: 4 }}>
                <img src={`/files/events/${g}`} alt="Gallery photo" />
                {manage && <OpForm op="events:gallery.remove" path={path}><input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="uploadId" value={g} /><Submit className="link">Remove</Submit></OpForm>}
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="panel prox">
        <div className="spread"><h2 className="h3">Attendees</h2><Link className="btn btn-sm prox" href={`/scan?event=${e.id}`}>Open scanner</Link></div>
        <div className="scroll"><table className="tbl rtable">
          <thead><tr><th>Name</th><th>Buyer email</th><th>Ticket</th><th>Code</th><th>Status</th><th>Checked in</th></tr></thead>
          <tbody>
            {attendees.map((t) => (
              <tr key={t.id}><td>{t.holderName}</td><td className="small" data-label="Email">{t.ticketOrder?.buyerEmail ?? t.buyerEmail ?? (t.holderName === "Physical ticket" ? "Physical stock" : "—")}</td><td data-label="Ticket">{t.ticketType.name} <span className="dim mono small">{aud(t.ticketType.priceCents)}</span></td>
                <td className="mono small" data-label="Code">{t.code}</td><td data-label="Status"><Status value={t.status} /></td><td className="mono" data-label="In">{t.checkedInAt ? time(t.checkedInAt) : "—"}</td></tr>
            ))}
            {attendees.length === 0 && <tr><td colSpan={6} className="dim">No tickets sold yet.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </>
  );
}
