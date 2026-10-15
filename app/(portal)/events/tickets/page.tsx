import { recentlyConfirmed, requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { aud, dateShort, time } from "@/ui/format";
import { Submit } from "@/ui/Forms";
import { Status } from "@/ui/Status";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { exportHref } from "@/components/EventPicker";

export const metadata = { title: "Ticket search" };

type T = {
  id: string; code: string; serial: number | null; status: string; format: "ETICKET" | "PHYSICAL" | "BOTH"; stage: string | null; source: "ONLINE" | "BOX_OFFICE" | "PARTNER";
  holderName: string; email: string | null; order: number | null; event: { id: string; name: string }; type: string; partner: { name: string; code: string; color: string } | null;
  priceCents: number; soldAt: string | null; checkedInAt: string | null; checkedInGate: string | null; voidReason: string | null; reissuedFromId: string | null; createdAt: string;
};
type D = { tickets: T[]; events: { id: string; name: string }[]; partners: { id: string; name: string; code: string }[] };
const FORMAT = { ETICKET: "E-ticket", PHYSICAL: "Physical", BOTH: "Both" } as const;
const SOURCE = { ONLINE: "Nepthic Online", BOX_OFFICE: "Box Office", PARTNER: "Partner" } as const;

/* Find any ticket by its readable code (with or without separators), holder or email, then
   void, reissue (new code and new QR) or re-tag it. */
export default async function Tickets({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const a = await requireSite("events");
  const manage = can(a, "events", "manage");
  const sp = await searchParams;
  const filters = { q: sp.q, eventId: sp.event, status: sp.status, source: sp.source, format: sp.format, partnerId: sp.partner, batchId: sp.batch };
  const r = await callSite<D>(a, "events", "tickets.search", filters);
  const confirmed = recentlyConfirmed(a);
  const path = `/events/tickets?${new URLSearchParams(Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>)}`;
  const head = <SectionHead site="events" title="Ticket search" livePath={null} sub="Every e-ticket and printed ticket. Codes match with or without dashes and spaces, so a code read out over the phone works too." />;
  if (!r.ok) return <>{head}<SiteProblem site="events" r={r} /></>;
  const { tickets, events, partners } = r.data;
  const physicalIds = tickets.filter((t) => t.format !== "ETICKET" && t.status !== "VOID").map((t) => t.id);

  return (
    <>
      {head}
      <form className="panel prox filters" role="search">
        <div className="form-grid">
          <label className="f">Code, name or email<input type="search" name="q" defaultValue={sp.q} placeholder="NEP-VIP-001001 or Theo" /></label>
          <label className="f">Event<select name="event" defaultValue={sp.event ?? ""}><option value="">All events</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
          <label className="f">Status<select name="status" defaultValue={sp.status ?? ""}><option value="">Any</option>{["VALID", "USED", "REFUND_REQUESTED", "REFUNDED", "VOID"].map((x) => <option key={x} value={x}>{x[0] + x.slice(1).toLowerCase().replace("_", " ")}</option>)}</select></label>
          <label className="f">Source<select name="source" defaultValue={sp.source ?? ""}><option value="">Any</option>{Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="f">Partner<select name="partner" defaultValue={sp.partner ?? ""}><option value="">Any</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label>
          <label className="f">Format<select name="format" defaultValue={sp.format ?? ""}><option value="">Any</option>{Object.entries(FORMAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        </div>
        {sp.batch && <input type="hidden" name="batch" value={sp.batch} />}
        <div className="row"><button className="btn btn-sm btn-primary">Search</button>{physicalIds.length > 0 && <a className="btn btn-sm btn-ghost" href={exportHref({ kind: "tickets", ids: physicalIds.join(","), layout: "a4" })} download>Print these {physicalIds.length} physical tickets (A4)</a>}</div>
      </form>
      <p className="small dim">{tickets.length === 100 ? "Showing the newest 100. Narrow the search to see others." : `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}.`}</p>
      <div className="cards">
        {tickets.map((t) => (
          <article key={t.id} className="card prox" id={t.code}>
            <div className="spread">
              <div className="row"><b className="mono">{t.code}</b><span className="dim small">{t.event.name} · {t.type}</span></div>
              <div className="row"><Status value={t.status} /><span className="pill">{FORMAT[t.format]}</span>{t.stage && <span className="pill info">{t.stage[0] + t.stage.slice(1).toLowerCase()}</span>}
                {t.partner ? <span className="partner-badge" style={{ background: t.partner.color }}>{t.partner.code}</span> : <span className="pill">{SOURCE[t.source]}</span>}</div>
            </div>
            <dl className="kv">
              <div><dt>Holder</dt><dd>{t.holderName}{t.email ? <div className="small dim">{t.email}</div> : null}</dd></div>
              {t.serial != null && <div><dt>Serial</dt><dd className="mono">{t.serial}</dd></div>}
              <div><dt>Source</dt><dd>{t.partner ? `${t.partner.name} (${t.partner.code})` : SOURCE[t.source]}</dd></div>
              <div><dt>Face value</dt><dd className="mono">{aud(t.priceCents)}</dd></div>
              <div><dt>Sold</dt><dd>{t.soldAt ? dateShort(t.soldAt) : "Not yet"}</dd></div>
              {t.order && <div><dt>Order</dt><dd className="mono">TO-{t.order}</dd></div>}
              {t.checkedInAt && <div><dt>Scanned in</dt><dd>{time(t.checkedInAt)}{t.checkedInGate ? ` · ${t.checkedInGate}` : ""}</dd></div>}
              {t.voidReason && <div><dt>Void</dt><dd className="small">{t.voidReason}</dd></div>}
            </dl>
            <div className="row">
              {t.format !== "ETICKET" && t.status !== "VOID" && <a className="btn btn-sm btn-ghost" href={exportHref({ kind: "tickets", ids: t.id, layout: "stub" })} download>Print (stub PDF)</a>}
            </div>
            {manage && !["VOID", "USED", "REFUNDED"].includes(t.status) && (
              <details className="small">
                <summary style={{ cursor: "pointer" }}>Void, reissue or re-tag (admin)</summary>
                <div className="cards-2" style={{ marginTop: 10 }}>
                  <OpForm op="events:ticket.reissue" path={path} className="stack-sm" confirm="reissuing a ticket" confirmed={confirmed}>
                    <input type="hidden" name="ticketId" value={t.id} />
                    <label className="f">Reason<input type="text" name="reason" placeholder="Lost, damaged…" /></label>
                    <p className="dim">Voids {t.code} (its QR is rejected from now on) and issues a replacement with a new code and a new QR.</p>
                    <Submit className="btn btn-sm prox">Void and reissue</Submit>
                  </OpForm>
                  <OpForm op="events:ticket.void" path={path} className="stack-sm" confirm="voiding a ticket" confirmed={confirmed}>
                    <input type="hidden" name="ticketId" value={t.id} />
                    <label className="f">Reason<input type="text" name="reason" placeholder="Why it's being cancelled" /></label>
                    <Submit className="btn btn-sm btn-bad">Void only</Submit>
                  </OpForm>
                  <OpForm op="events:ticket.retag" path={path} className="stack-sm" confirm="changing a ticket's source" confirmed={confirmed}>
                    <input type="hidden" name="ticketId" value={t.id} />
                    <label className="f">Source<select name="partnerId" defaultValue={""}><option value="">Not a partner</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label>
                    <label className="f">If not a partner<select name="source" defaultValue={t.source === "BOX_OFFICE" ? "BOX_OFFICE" : "ONLINE"}><option value="ONLINE">Nepthic Online</option><option value="BOX_OFFICE">Box Office</option></select></label>
                    <p className="dim">{t.soldAt ? "Sold tickets can only be re-tagged by a Super Admin. Every change is in the audit log." : "Every change is in the audit log."}</p>
                    <Submit className="btn btn-sm">Change source</Submit>
                  </OpForm>
                </div>
              </details>
            )}
          </article>
        ))}
        {tickets.length === 0 && <div className="empty">No tickets match.</div>}
      </div>
    </>
  );
}
