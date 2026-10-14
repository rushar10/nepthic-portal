import Link from "next/link";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { aud0, dateLong } from "@/ui/format";
import { Status } from "@/ui/Status";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Events & tickets" };

type E = { id: string; slug: string; name: string; venue: string; startsAt: string; status: string; checkedIn: number; ticketTypes: { id: string; name: string; priceCents: number; capacity: number; sold: number }[] };

export default async function EventsList() {
  const a = await requireSite("events");
  const r = await callSite<{ events: E[] }>(a, "events", "events.list");
  const manage = can(a, "events", "manage");
  const now = Date.now();
  return (
    <>
      <SectionHead site="events" title="Events & ticket sales" livePath="/upcoming">
        {manage && <Link className="btn btn-primary prox" href="/events/events/new">New event</Link>}
      </SectionHead>
      {!r.ok ? <SiteProblem site="events" r={r} /> : (
        <section className="panel prox">
          <div className="scroll"><table className="tbl rtable">
            <thead><tr><th>Event</th><th>Date</th><th>Ticket types</th><th>Sold / capacity</th><th className="num">Gross</th><th className="num">Checked in</th><th>Status</th></tr></thead>
            <tbody>
              {r.data.events.map((e) => {
                const cap = e.ticketTypes.reduce((n, t) => n + t.capacity, 0);
                const sold = e.ticketTypes.reduce((n, t) => n + t.sold, 0);
                const gross = e.ticketTypes.reduce((n, t) => n + t.sold * t.priceCents, 0);
                return (
                  <tr key={e.id}>
                    <td><Link href={`/events/events/${e.id}`}><b>{e.name}</b></Link><div className="small dim">{e.venue}</div></td>
                    <td className="small" data-label="Date">{dateLong(e.startsAt)}</td>
                    <td className="small" data-label="Types">{e.ticketTypes.map((t) => <div key={t.id}>{t.name} <span className="mono dim">{aud0(t.priceCents)}</span></div>)}</td>
                    <td style={{ minWidth: 150 }} data-label="Sold"><div className="bar"><i style={{ width: `${cap ? (sold / cap) * 100 : 0}%` }} /></div><span className="small mono">{sold} / {cap}</span></td>
                    <td className="num" data-label="Gross">{aud0(gross)}</td>
                    <td className="num" data-label="Checked in">{e.checkedIn}</td>
                    <td data-label="Status">{e.status === "PUBLISHED" && new Date(e.startsAt).getTime() < now ? <span className="pill">Conducted</span> : <Status value={e.status} />}</td>
                  </tr>
                );
              })}
              {r.data.events.length === 0 && <tr><td colSpan={7} className="dim">No events yet.</td></tr>}
            </tbody>
          </table></div>
          <p className="small dim">Sold includes seats held by checkouts in progress (released after 30 minutes if unpaid).</p>
        </section>
      )}
    </>
  );
}
