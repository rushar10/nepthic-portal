import Link from "next/link";
import { recentlyConfirmed, requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { aud, dateShort, time } from "@/ui/format";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { ORDER_LABEL, type CloOrder } from "@/core/clothing";

export const metadata = { title: "Clothing orders" };

/* Retail orders. Staff ship them; site admins can also refund (with the 2FA code again). */
export default async function Orders({ searchParams }: { searchParams: Promise<{ show?: string; q?: string }> }) {
  const a = await requireSite("clothing");
  const { show, q } = await searchParams;
  const all = show === "all" || !!q;
  const r = await callSite<{ orders: CloOrder[] }>(a, "clothing", "orders.list", { show: all ? "all" : "open", q });
  const manage = can(a, "clothing", "manage");
  const confirmed = recentlyConfirmed(a);
  const path = `/clothing/orders${show === "all" ? "?show=all" : ""}`;
  const head = (
    <SectionHead site="clothing" title="Orders" livePath="/" sub={manage ? "Ship paid orders and refund when needed. Refunds go back through the store's payment provider." : "Ship paid orders. Refunds are done by a Clothing site admin."}>
      <nav className="row" aria-label="Filter">
        <Link className="tab" href="/clothing/orders" aria-current={!all ? "page" : undefined}>To ship</Link>
        <Link className="tab" href="/clothing/orders?show=all" aria-current={all ? "page" : undefined}>All</Link>
      </nav>
      <form className="row" role="search"><input type="hidden" name="show" value="all" /><input type="search" name="q" defaultValue={q} placeholder="Order, name or email" aria-label="Search orders" style={{ width: 200 }} /><button className="btn btn-sm">Search</button></form>
    </SectionHead>
  );
  if (!r.ok) return <>{head}<SiteProblem site="clothing" r={r} /></>;
  const list = r.data.orders;

  return (
    <>
      {head}
      {list.length === 0 ? <div className="empty">{q ? "No orders match." : all ? "No orders yet." : "Nothing to ship. All caught up."}</div> : (
        <div className="cards">
          {list.map((o) => {
            const left = o.totalCents - o.refundedCents;
            const [label, tone] = ORDER_LABEL[o.status];
            const items = o.lines.reduce((n, l) => n + l.qty, 0);
            return (
              <article key={o.id} id={o.number} className="card prox">
                <div className="spread">
                  <div className="row"><b className="mono">{o.number}</b><span>{o.customerName}</span><span className="dim small">{dateShort(o.createdAt)} {time(o.createdAt)}</span></div>
                  <div className="row"><span className={`pill ${tone}`}>{label}</span>{o.fulfilledAt && o.status !== "FULFILLED" && <span className="pill ok">Shipped</span>}</div>
                </div>
                <ul className="small order-lines">
                  {o.lines.map((l, i) => <li key={i}>{l.qty} × {l.name} <span className="dim">· {l.size} · {l.sku}</span> <span className="mono">{aud(l.unitCents * l.qty)}</span></li>)}
                </ul>
                <dl className="kv">
                  <div><dt>Items</dt><dd className="mono">{items}</dd></div>
                  <div><dt>Total</dt><dd className="mono">{aud(o.totalCents)}</dd></div>
                  {o.discountCode && <div><dt>Discount</dt><dd><span className="mono">{o.discountCode}</span> −{aud(o.discountCents)}</dd></div>}
                  <div><dt>Shipping</dt><dd className="mono">{o.shippingCents ? aud(o.shippingCents) : "Free"}</dd></div>
                  {o.refundedCents > 0 && <div><dt>Refunded</dt><dd className="mono">{aud(o.refundedCents)}</dd></div>}
                  <div><dt>Ship to</dt><dd>{o.shipTo || "—"}</dd></div>
                  <div><dt>Email</dt><dd className="small">{o.email}</dd></div>
                  {o.fulfilledAt && <div><dt>Shipped</dt><dd className="small">{dateShort(o.fulfilledAt)}{o.tracking ? ` · ${o.carrier} ${o.tracking}` : ""}</dd></div>}
                </dl>
                {!o.fulfilledAt && o.status !== "REFUNDED" && (
                  <OpForm op="clothing:order.fulfil" path={path} className="row ship-row" optimistic="Shipped">
                    <input type="hidden" name="orderId" value={o.id} />
                    <label className="f" style={{ width: 170 }}>Carrier<select name="carrier" defaultValue="Australia Post"><option>Australia Post</option><option>StarTrack</option><option>Sendle</option><option>Aramex</option></select></label>
                    <label className="f" style={{ flex: "0 1 300px", minWidth: 160 }}>Tracking number<input type="text" name="tracking" maxLength={60} placeholder="Optional" /></label>
                    <Submit className="btn btn-sm btn-primary prox" pendingText="Saving…">Mark shipped</Submit>
                  </OpForm>
                )}
                {manage && left > 0 && (
                  <details className="small">
                    <summary style={{ cursor: "pointer" }}>Refund (admin) · up to {aud(left)}</summary>
                    <OpForm op="clothing:order.refund" path={path} className="stack-sm" confirm="refunds" confirmed={confirmed}>
                      <input type="hidden" name="orderId" value={o.id} />
                      <div className="form-grid" style={{ marginTop: 10 }}>
                        <label className="f">Amount ($)<input type="number" name="amount" step="0.01" min="0.01" max={(left / 100).toFixed(2)} placeholder={`${(left / 100).toFixed(2)} (everything left)`} /></label>
                        <label className="f">Reason (internal)<input type="text" name="reason" required maxLength={200} placeholder="Faulty, returned, goodwill…" /></label>
                      </div>
                      <label className="row small"><input type="checkbox" name="restock" /> Put the items back in stock</label>
                      <Submit className="btn btn-sm btn-bad">Refund</Submit>
                    </OpForm>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
