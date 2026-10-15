import { requireAdmin } from "@/core/auth";
import { callSite } from "@/core/ops";
import { env } from "@/core/env";
import { aud, dateShort } from "@/ui/format";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SiteProblem } from "@/components/SiteProblem";

type Al = { id: string; kind: "PHYSICAL" | "ETICKET" | "LINK"; quantity: number; revoked: boolean; event: { name: string; startsAt: string }; type: string; priceCents: number; issued: number; sold: number; scanned: number; left: number; unsold: number };
type D = {
  partner: { name: string; code: string; color: string; status: string; commissionPct: number; link: string; referralCode: string };
  allocations: Al[]; linkSales: { eventId: string; n: number; rev: number }[];
  tickets: { id: string; code: string; event: string; type: string; format: string; stage: string | null; status: string; soldAt: string | null; holderName: string }[];
};
const KIND = { PHYSICAL: "Physical tickets", ETICKET: "E-tickets", LINK: "Sales link" } as const;

export default async function PartnerHome() {
  const a = await requireAdmin({ allowPartner: true });
  const r = await callSite<D>(a, "events", "partner.me", {}, { level: "partner" });
  if (!r.ok) return <SiteProblem site="events" r={r} />;
  const { partner: p, allocations, tickets } = r.data;
  const link = `${env.sites.events.url}${p.link}`;
  return (
    <>
      <div className="dash-head">
        <div><p className="eyebrow">Nepthic Events partner</p><h1 className="row" style={{ gap: 10 }}><span className="partner-badge" style={{ background: p.color }}>{p.code}</span>{p.name}</h1></div>
        {p.status === "SUSPENDED" ? <span className="pill bad">Suspended: contact Nepthic</span> : <span className="pill ok">Active</span>}
      </div>
      <section className="panel prox">
        <b>Your sales link</b>
        <p className="mono small copyable">{link}</p>
        <p className="small dim">Tickets bought through this link, or with your partner code <span className="mono">{p.referralCode}</span> at checkout, are credited to you{p.commissionPct ? ` (${p.commissionPct}% commission)` : ""}.</p>
      </section>
      <div className="cards">
        {allocations.map((x) => (
          <article key={x.id} className="card prox" style={{ opacity: x.revoked ? 0.6 : 1 }}>
            <div className="spread"><div><b>{x.event.name}</b> <span className="dim small">{dateShort(x.event.startsAt)} · {x.type} · {KIND[x.kind]}</span></div>{x.revoked && <span className="pill bad">Revoked</span>}</div>
            <dl className="kv">
              <div><dt>Allocated</dt><dd className="mono">{x.quantity}</dd></div>
              <div><dt>Sold</dt><dd className="mono">{x.sold}</dd></div>
              <div><dt>{x.kind === "PHYSICAL" ? "Unsold stock" : "Left"}</dt><dd className="mono">{x.kind === "PHYSICAL" ? x.unsold : Math.max(0, x.left)}</dd></div>
              <div><dt>Scanned in</dt><dd className="mono">{x.scanned}</dd></div>
              <div><dt>Face value sold</dt><dd className="mono">{aud(x.sold * x.priceCents)}</dd></div>
            </dl>
            {!x.revoked && p.status === "ACTIVE" && x.kind === "PHYSICAL" && x.unsold > 0 && (
              <OpForm op="events:partner.markSold" path="/partner" className="stack-sm">
                <label className="f">Mark sold: ticket codes (scan or type, separated by spaces)<textarea name="codes" rows={2} /></label>
                <Submit className="btn btn-sm prox" pendingText="Saving…">Mark sold</Submit>
              </OpForm>
            )}
            {!x.revoked && p.status === "ACTIVE" && x.kind === "ETICKET" && x.left > 0 && (
              <OpForm op="events:partner.issue" path="/partner" className="stack-sm">
                <input type="hidden" name="allocationId" value={x.id} />
                <div className="form-grid">
                  <label className="f">Name on ticket<input type="text" name="holderName" required /></label>
                  <label className="f">Buyer email<input type="email" name="email" required /></label>
                  <label className="f">Quantity<input type="number" name="quantity" min={1} max={Math.min(20, x.left)} defaultValue={1} /></label>
                </div>
                <Submit className="btn btn-sm prox" pendingText="Issuing…">Issue e-ticket and email it</Submit>
              </OpForm>
            )}
          </article>
        ))}
        {allocations.length === 0 && <div className="empty">No allocations yet. Nepthic will add them here.</div>}
      </div>
      <section className="panel prox">
        <h2 className="h3">Your latest tickets</h2>
        <div className="scroll"><table className="tbl rtable">
          <thead><tr><th>Code</th><th>Event</th><th>Type</th><th>Status</th><th>Sold</th></tr></thead>
          <tbody>{tickets.map((t) => <tr key={t.id}><td className="mono">{t.code}</td><td data-label="Event">{t.event}</td><td data-label="Type">{t.type} · {t.format === "ETICKET" ? "e-ticket" : "physical"}</td><td data-label="Status">{t.status === "USED" ? "Scanned in" : t.status === "VOID" ? "Void" : t.stage && t.stage !== "SOLD" ? "Unsold" : "Valid"}</td><td data-label="Sold">{t.soldAt ? dateShort(t.soldAt) : "—"}</td></tr>)}</tbody>
        </table></div>
      </section>
    </>
  );
}
