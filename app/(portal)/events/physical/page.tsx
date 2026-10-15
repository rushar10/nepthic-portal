import Link from "next/link";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { aud, dateShort, time } from "@/ui/format";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { exportHref, sortEvents } from "@/components/EventPicker";

export const metadata = { title: "Physical tickets" };

type Stats = { generated: number; printed: number; distributed: number; sold: number; scanned: number; voided: number; first: string; last: string };
type B = { id: string; number: number; quantity: number; printFormat: string; createdAt: string; createdBy: string; event: { id: string; name: string }; ticketType: { name: string }; partner: { name: string; code: string } | null; stats: Stats | null };
type D = {
  batches: B[];
  events: { id: string; name: string; startsAt: string; status: string; ticketTypes: { id: string; name: string; left: number }[] }[];
  partners: { id: string; name: string; code: string }[];
  allocations: { id: string; eventId: string; label: string }[];
};
type O = { id: string; number: number; buyerName: string; buyerEmail: string; format: string; delivery: "PICKUP" | "POST" | null; shipTo: string | null; shippedAt: string | null; tracking: string | null; pickedUpAt: string | null; totalCents: number; createdAt: string; event: { name: string; startsAt: string }; tickets: { id: string; code: string; status: string }[] };
const LAYOUTS = [["a4", "A4 sheet (5 per page, crop marks)"], ["stub", 'Ticket stub 2" × 5.5"'], ["thermal", "Thermal 80 mm"]] as const;

/* Physical tickets: generate print-ready batches, follow each ticket from Generated → Printed →
   Distributed/Sold → Scanned, and send out customers' printed tickets. */
export default async function Physical({ searchParams }: { searchParams: Promise<{ event?: string; allocation?: string; show?: string }> }) {
  const a = await requireSite("events");
  const manage = can(a, "events", "manage");
  const sp = await searchParams;
  const [r, orders] = await Promise.all([
    callSite<D>(a, "events", "batches.list", {}),
    callSite<{ orders: O[]; show: string }>(a, "events", "orders.physical", { show: sp.show }),
  ]);
  const head = <SectionHead site="events" title="Physical tickets" livePath={null} sub="Print-ready tickets with a high-contrast QR, the readable code, serial number and (for partners) a “Sold by” line. Same validation as e-tickets: each ticket gets in once." />;
  if (!r.ok) return <>{head}<SiteProblem site="events" r={r} /></>;
  const events = sortEvents(r.data.events).filter((e) => e.status === "PUBLISHED" || e.id === sp.event);
  const ev = events.find((e) => e.id === sp.event) ?? events[0];
  const allocs = r.data.allocations.filter((x) => x.eventId === ev?.id);
  const path = `/events/physical${sp.event ? `?event=${sp.event}` : ""}`;

  return (
    <>
      {head}
      {manage && ev && (
        <OpForm op="events:batch.create" path={path} className="panel prox">
          <div className="spread"><h2 className="h3">Generate tickets</h2>
            <nav className="row small" aria-label="Event">{events.slice(0, 6).map((e) => <Link key={e.id} className="tab" href={`/events/physical?event=${e.id}`} aria-current={e.id === ev.id ? "page" : undefined}>{e.name}</Link>)}</nav></div>
          <input type="hidden" name="eventId" value={ev.id} />
          <div className="form-grid">
            <label className="f">For<select name="allocationId" defaultValue={sp.allocation ?? ""}>
              <option value="">Box office / Nepthic stock</option>
              {allocs.map((x) => <option key={x.id} value={x.id}>Partner allocation · {x.label}</option>)}
            </select></label>
            <label className="f">Ticket type <span className="dim small">(box office stock)</span><select name="typeId">{ev.ticketTypes.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.left} left</option>)}</select></label>
            <label className="f">Quantity<input type="number" name="quantity" min={1} max={2000} defaultValue={50} required /></label>
            <label className="f">Print format<select name="printFormat" defaultValue="a4">{LAYOUTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          </div>
          <p className="small dim">Generating creates the tickets straight away (status Generated) and holds their seats; a partner allocation&apos;s seats are already held. Download the PDF and CSV from the batch below.</p>
          <Submit pendingText="Generating…">Generate tickets for {ev.name}</Submit>
        </OpForm>
      )}

      <section className="panel prox">
        <h2 className="h3">Print batches</h2>
        <div className="cards">
          {r.data.batches.map((b) => {
            const st = b.stats;
            return (
              <article key={b.id} className="card" id={`PB-${b.number}`}>
                <div className="spread">
                  <div className="row"><b className="mono">PB-{b.number}</b><span>{b.event.name} · {b.ticketType.name}</span>{b.partner ? <span className="pill">{b.partner.code} · {b.partner.name}</span> : <span className="pill">Box office</span>}</div>
                  <span className="dim small">{b.quantity} tickets · {dateShort(b.createdAt)} {time(b.createdAt)} · {b.createdBy.split(" (")[0]}</span>
                </div>
                {st && (
                  <div className="stage-row small">
                    <span className="pill">Generated {st.generated}</span><span className="pill info">Printed {st.printed}</span><span className="pill info">Distributed {st.distributed}</span>
                    <span className="pill ok">Sold {st.sold}</span><span className="pill ok">Scanned {st.scanned}</span>{st.voided > 0 && <span className="pill bad">Void {st.voided}</span>}
                    <span className="dim mono">{st.first} … {st.last}</span>
                  </div>
                )}
                <div className="row">
                  {LAYOUTS.map(([k, l]) => <a key={k} className={`btn btn-sm${k === b.printFormat ? " prox" : " btn-ghost"}`} href={exportHref({ kind: "batch", id: b.id, layout: k })} download>{k === "a4" ? "A4 PDF" : k === "stub" ? "Stub PDF" : "Thermal PDF"}</a>)}
                  <a className="btn btn-sm btn-ghost" href={exportHref({ kind: "batch-csv", id: b.id })} download>CSV list</a>
                  <Link className="btn btn-sm btn-ghost" href={`/events/tickets?batch=${b.id}`}>Tickets</Link>
                </div>
                <div className="row">
                  {st && st.generated > 0 && <OpForm op="events:batch.markPrinted" path={path}><input type="hidden" name="batchId" value={b.id} /><Submit className="btn btn-sm" pendingText="Saving…">Mark {st.generated} printed</Submit></OpForm>}
                  {st && st.generated + st.printed > 0 && <OpForm op="events:tickets.stage" path={path}><input type="hidden" name="batchId" value={b.id} /><input type="hidden" name="stage" value="DISTRIBUTED" /><Submit className="btn btn-sm" pendingText="Saving…">Mark distributed{b.partner ? ` to ${b.partner.code}` : ""}</Submit></OpForm>}
                </div>
                {st && st.generated + st.printed + st.distributed > 0 && (
                  <details className="small">
                    <summary style={{ cursor: "pointer" }}>Mark tickets sold (scan or type codes)</summary>
                    <OpForm op="events:tickets.stage" path={path} className="stack-sm">
                      <input type="hidden" name="stage" value="SOLD" />
                      <label className="f">Ticket codes, separated by spaces or new lines<textarea name="codes" rows={3} placeholder={`${st.first}\n${st.last}`} /></label>
                      <Submit className="btn btn-sm prox" pendingText="Saving…">Mark sold</Submit>
                    </OpForm>
                  </details>
                )}
              </article>
            );
          })}
          {r.data.batches.length === 0 && <div className="empty">No physical tickets generated yet.</div>}
        </div>
      </section>

      <section className="panel prox" id="orders">
        <div className="spread"><h2 className="h3">Customers&apos; printed tickets</h2>
          <nav className="row small"><Link className="tab" href="/events/physical#orders" aria-current={sp.show !== "all" ? "page" : undefined}>To send</Link><Link className="tab" href="/events/physical?show=all#orders" aria-current={sp.show === "all" ? "page" : undefined}>All</Link></nav></div>
        {!orders.ok ? <SiteProblem site="events" r={orders} /> : orders.data.orders.length === 0 ? <p className="dim">Nothing waiting. Physical and “both” orders appear here to post or hand over.</p> : (
          <div className="scroll"><table className="tbl rtable">
            <thead><tr><th>Order</th><th>Buyer</th><th>Event</th><th>Tickets</th><th>Delivery</th><th /></tr></thead>
            <tbody>
              {orders.data.orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">TO-{o.number}<div className="small dim">{dateShort(o.createdAt)} · {aud(o.totalCents)}</div></td>
                  <td data-label="Buyer">{o.buyerName}<div className="small dim">{o.buyerEmail}</div></td>
                  <td data-label="Event" className="small">{o.event.name}</td>
                  <td data-label="Tickets" className="small mono">{o.tickets.map((t) => t.code).join(", ")}<div><a className="small" href={exportHref({ kind: "tickets", ids: o.tickets.filter((t) => t.status !== "VOID").map((t) => t.id).join(","), layout: "stub" })} download>Print PDF</a></div></td>
                  <td data-label="Delivery" className="small">{o.delivery === "POST" ? <>Tracked post · {o.shipTo}{o.shippedAt ? <div className="dim">Posted {dateShort(o.shippedAt)} · {o.tracking}</div> : null}</> : <>Box office pickup{o.pickedUpAt ? <div className="dim">Picked up {dateShort(o.pickedUpAt)}</div> : null}</>}{o.format === "BOTH" && <div className="dim">+ e-ticket (same QR)</div>}</td>
                  <td>
                    {o.delivery === "POST" && !o.shippedAt && <OpForm op="events:order.ship" path="/events/physical" className="row"><input type="hidden" name="orderId" value={o.id} /><input type="text" name="tracking" placeholder="Tracking no." style={{ width: 130 }} required /><Submit className="btn btn-sm">Posted</Submit></OpForm>}
                    {o.delivery === "PICKUP" && !o.pickedUpAt && <OpForm op="events:order.pickedUp" path="/events/physical"><input type="hidden" name="orderId" value={o.id} /><Submit className="btn btn-sm">Picked up</Submit></OpForm>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
