import Link from "next/link";
import { recentlyConfirmed, requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { env } from "@/core/env";
import { dateShort } from "@/ui/format";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { EventPicker, PARTNER_TABS, SubTabs, sortEvents } from "@/components/EventPicker";

export const metadata = { title: "Partner allocations" };

type A = {
  id: string; kind: "PHYSICAL" | "ETICKET" | "LINK"; quantity: number; rangeStart: number | null; rangeEnd: number | null; revokedAt: string | null; createdAt: string;
  partner: { id: string; name: string; code: string; color: string; status: string; referralCode: string }; ticketType: { id: string; name: string };
  issued: number; sold: number; scanned: number; left: number; rangeUsed: number | null;
};
type D = {
  event: { id: string; name: string; slug: string; ticketTypes: { id: string; name: string; capacity: number; sold: number }[] };
  format: { padding: number; scope: string; max: number }; allocations: A[]; partners: { id: string; name: string; code: string; status: string }[];
};
const KIND: Record<A["kind"], string> = { PHYSICAL: "Physical tickets", ETICKET: "E-tickets", LINK: "Sales link / code" };
const pct = (a: number, b: number) => `${b ? Math.min(100, Math.round((a / b) * 100)) : 0}%`;

/* Tickets set aside for each partner at one event. Physical and e-ticket allocations hold seats;
   a sales-link allocation is a target that counts online sales through their link or code. */
export default async function Allocations({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const a = await requireSite("events");
  const manage = can(a, "events", "manage");
  const { event } = await searchParams;
  const evs = await callSite<{ events: { id: string; name: string; startsAt: string }[] }>(a, "events", "events.list");
  const list = evs.ok ? sortEvents(evs.data.events) : [];
  const current = event ?? list[0]?.id;
  const r = current ? await callSite<D>(a, "events", "allocations.list", { eventId: current }) : null;
  const path = `/events/allocations?event=${current ?? ""}`;
  const confirmed = recentlyConfirmed(a);
  const head = (
    <SectionHead site="events" title="Partner allocations" livePath={null} sub="Allocate tickets to partners per event. Every ticket they issue is tagged with them for good, and shows their name at the door.">
      <SubTabs items={PARTNER_TABS} current="/events/allocations" />
    </SectionHead>
  );
  if (!evs.ok) return <>{head}<SiteProblem site="events" r={evs} /></>;
  if (!r) return <>{head}<div className="empty">No events yet.</div></>;
  if (!r.ok) return <>{head}<EventPicker events={list} current={current} path="/events/allocations" /><SiteProblem site="events" r={r} /></>;
  const { allocations, partners, event: e, format } = r.data;

  return (
    <>
      {head}
      <EventPicker events={list} current={current} path="/events/allocations" />
      <div className="cards">
        {allocations.map((x) => (
          <article key={x.id} className="card prox" style={{ opacity: x.revokedAt ? 0.6 : 1 }}>
            <div className="spread">
              <div className="row"><span className="partner-badge" style={{ background: x.partner.color }}>{x.partner.code}</span><b>{x.partner.name}</b><span className="dim small">{x.ticketType.name} · {KIND[x.kind]}</span></div>
              <div className="row">
                {x.revokedAt ? <span className="pill bad">Revoked {dateShort(x.revokedAt)}</span> : x.partner.status === "SUSPENDED" ? <span className="pill warn">Partner suspended</span> : <span className="pill ok">Active</span>}
                {x.rangeStart != null && <span className="pill mono">Numbers {x.rangeStart}–{x.rangeEnd}</span>}
              </div>
            </div>
            <div className="row" style={{ alignItems: "center" }}>
              <div className="meter" style={{ flex: 1 }} role="img" aria-label={`${x.sold} sold of ${x.quantity}`}><i className="b" style={{ width: pct(x.issued, x.quantity) }} /><i style={{ width: pct(x.sold, x.quantity) }} /></div>
              <span className="small mono">{x.sold} sold · {x.issued} issued · {x.quantity} allocated</span>
            </div>
            <dl className="kv">
              <div><dt>Left to issue</dt><dd className="mono">{Math.max(0, x.left)}</dd></div>
              <div><dt>Unsold stock</dt><dd className="mono">{Math.max(0, x.issued - x.sold)}</dd></div>
              <div><dt>Scanned in</dt><dd className="mono">{x.scanned}</dd></div>
              {x.rangeStart != null && <div><dt>Range used</dt><dd className="mono">{x.rangeUsed} of {x.rangeEnd! - x.rangeStart + 1}</dd></div>}
              {x.kind === "LINK" && <div><dt>Link</dt><dd className="small mono copyable">{env.sites.events.url}/e/{e.slug}?ref={x.partner.referralCode}</dd></div>}
            </dl>
            {!x.revokedAt && (
              <div className="row">
                {x.kind === "PHYSICAL" && x.left > 0 && <Link className="btn btn-sm prox" href={`/events/physical?event=${e.id}&allocation=${x.id}`}>Print tickets</Link>}
                <Link className="btn btn-sm btn-ghost" href={`/events/tickets?event=${e.id}&partner=${x.partner.id}`}>Their tickets</Link>
              </div>
            )}
            {manage && !x.revokedAt && x.kind === "ETICKET" && x.left > 0 && (
              <details className="small">
                <summary style={{ cursor: "pointer" }}>Issue e-tickets to a buyer</summary>
                <OpForm op="events:allocation.issue" path={path} className="stack-sm">
                  <input type="hidden" name="allocationId" value={x.id} />
                  <div className="form-grid">
                    <label className="f">Name on ticket<input type="text" name="holderName" required /></label>
                    <label className="f">Buyer email<input type="email" name="email" required /></label>
                    <label className="f">Quantity<input type="number" name="quantity" min={1} max={Math.min(20, x.left)} defaultValue={1} /></label>
                  </div>
                  <Submit className="btn btn-sm prox" pendingText="Issuing…">Issue and email</Submit>
                </OpForm>
              </details>
            )}
            {manage && !x.revokedAt && (
              <details className="small">
                <summary style={{ cursor: "pointer" }}>Revoke allocation (admin)</summary>
                <OpForm op="events:allocation.revoke" path={path} className="stack-sm" confirm="revoking an allocation" confirmed={confirmed}>
                  <input type="hidden" name="id" value={x.id} />
                  <p className="dim">Unissued seats go back on sale. Tickets already issued stay valid but are flagged at the door for a supervisor.</p>
                  <Submit className="btn btn-sm btn-bad">Revoke</Submit>
                </OpForm>
              </details>
            )}
          </article>
        ))}
        {allocations.length === 0 && <div className="empty">No partner allocations for {e.name} yet.</div>}
      </div>
      {manage && (
        <OpForm op="events:allocation.save" path={path} className="panel prox">
          <h2 className="h3">Allocate tickets to a partner</h2>
          <input type="hidden" name="eventId" value={e.id} />
          <div className="form-grid">
            <label className="f">Partner<select name="partnerId" required>{partners.filter((p) => p.status === "ACTIVE").map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label>
            <label className="f">Ticket type<select name="typeId" required>{e.ticketTypes.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.capacity - t.sold} left</option>)}</select></label>
            <label className="f">As<select name="kind" defaultValue="PHYSICAL"><option value="PHYSICAL">Physical tickets (printed for them)</option><option value="ETICKET">E-tickets (they issue to buyers)</option><option value="LINK">Sales link / code (online sales target)</option></select></label>
            <label className="f">Quantity<input type="number" name="quantity" min={1} max={20000} required /></label>
            <label className="f">Reserve numbers from <span className="dim small">optional</span><input type="number" name="rangeStart" min={0} max={format.max} placeholder="e.g. 1001" /></label>
            <label className="f">to<input type="number" name="rangeEnd" min={0} max={format.max} placeholder="e.g. 1200" /></label>
          </div>
          <p className="small dim">Physical and e-ticket allocations hold their seats straight away. A reserved number range gives this partner&apos;s codes their own block (e.g. P012-1001 to P012-1200); ranges can&apos;t overlap, and other tickets skip them. Numbers go up to {format.max} ({format.padding} digits).</p>
          <Submit pendingText="Allocating…">Allocate</Submit>
        </OpForm>
      )}
    </>
  );
}
