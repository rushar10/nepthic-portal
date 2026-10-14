import Link from "next/link";
import { recentlyConfirmed, requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { aud, dateShort, orderNo } from "@/ui/format";
import { Status } from "@/ui/Status";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Bulk orders" };

type O = {
  id: string; number: number; status: string; fulfilment: string; totalCents: number; paidCents: number; refundedCents: number;
  paymentMode: "FULL" | "DEPOSIT"; depositPct: number; createdAt: string; business: { tradingName: string } | null;
  items: { id: string; variantId: string | null; description: string; quantity: number; unitPriceCents: number }[];
};

export default async function Orders({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const a = await requireSite("wholesale");
  const { show } = await searchParams;
  const r = await callSite<{ orders: O[] }>(a, "wholesale", "orders.list", { show });
  if (!r.ok) return <><SectionHead site="wholesale" title="Bulk orders" livePath="/order" /><SiteProblem site="wholesale" r={r} /></>;
  const list = r.data.orders;
  const manage = can(a, "wholesale", "manage");
  const confirmed = recentlyConfirmed(a);
  const path = `/wholesale/orders${show === "all" ? "?show=all" : ""}`;

  return (
    <>
      <SectionHead site="wholesale" title="Bulk orders" sub="Orders ship only once paid in full. Payment terms can change until the first payment arrives." livePath="/order">
        <nav className="row">
          <Link className="tab" href="/wholesale/orders" aria-current={show !== "all" ? "page" : undefined}>Open</Link>
          <Link className="tab" href="/wholesale/orders?show=all" aria-current={show === "all" ? "page" : undefined}>All</Link>
        </nav>
      </SectionHead>
      {list.length === 0 ? <div className="empty">No open orders.</div> : (
        <div className="cards">
          {list.map((o) => {
            const due = o.totalCents - o.paidCents;
            const units = o.items.reduce((n, i) => n + (i.variantId ? i.quantity : 0), 0);
            return (
              <article key={o.id} id={o.id} className="card prox">
                <div className="spread">
                  <div className="row"><b className="mono">{orderNo(o.number)}</b><span>{o.business?.tradingName}</span><span className="dim small">{dateShort(o.createdAt)}</span></div>
                  <div className="row"><Status value={o.status} /><Status value={o.fulfilment} /></div>
                </div>
                <dl className="kv">
                  <div><dt>Units</dt><dd className="mono">{units || "Quote"}</dd></div>
                  <div><dt>Total</dt><dd className="mono">{aud(o.totalCents)}</dd></div>
                  <div><dt>Paid</dt><dd className="mono">{aud(o.paidCents)}</dd></div>
                  <div><dt>Outstanding</dt><dd className="mono">{aud(Math.max(0, due))}</dd></div>
                  <div><dt>Terms</dt><dd>{o.paymentMode === "DEPOSIT" ? `${o.depositPct}% deposit` : "Full"}</dd></div>
                  {o.refundedCents > 0 && <div><dt>Refunded</dt><dd className="mono">{aud(o.refundedCents)}</dd></div>}
                </dl>
                <details>
                  <summary className="small dim" style={{ cursor: "pointer" }}>{o.items.length} line{o.items.length > 1 ? "s" : ""}</summary>
                  <ul className="small" style={{ margin: "8px 0 0", paddingLeft: "1.2em" }}>
                    {o.items.map((i) => <li key={i.id}>{i.description} × {i.quantity} @ {aud(i.unitPriceCents)}</li>)}
                  </ul>
                </details>
                <div className="row">
                  {o.paidCents > 0 && due > 0 && (
                    <OpForm op="wholesale:order.requestBalance" path={path}><input type="hidden" name="orderId" value={o.id} /><Submit className="btn btn-sm prox" pendingText="Sending…">{o.status === "BALANCE_REQUESTED" ? "Resend balance request" : `Request ${aud(due)} balance`}</Submit></OpForm>
                  )}
                  {o.status === "PAID" && o.fulfilment === "IN_PRODUCTION" && (
                    <OpForm op="wholesale:order.fulfilment" path={path}><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="to" value="SHIPPED" /><Submit className="btn btn-sm btn-primary prox" optimistic="Shipped">Mark shipped</Submit></OpForm>
                  )}
                  {o.fulfilment === "SHIPPED" && (
                    <OpForm op="wholesale:order.fulfilment" path={path}><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="to" value="DELIVERED" /><Submit className="btn btn-sm prox" optimistic="Delivered">Mark delivered</Submit></OpForm>
                  )}
                </div>
                {manage && o.paidCents === 0 && o.status !== "CANCELLED" && (
                  <details className="small">
                    <summary style={{ cursor: "pointer" }}>Change terms or cancel (admin)</summary>
                    <div className="cards-2" style={{ marginTop: 10 }}>
                      <OpForm op="wholesale:order.terms" path={path} className="stack-sm" confirm="payment change" confirmed={confirmed}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <label className="f">Payment terms<select name="paymentMode" defaultValue={o.paymentMode}><option value="DEPOSIT">Deposit</option><option value="FULL">Full</option></select></label>
                        <Submit className="btn btn-sm">Set terms</Submit>
                      </OpForm>
                      <OpForm op="wholesale:order.cancel" path={path} className="stack-sm" confirm="cancelling an order" confirmed={confirmed}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <p className="small dim">Cancels {orderNo(o.number)}. Only unpaid orders can be cancelled.</p>
                        <Submit className="btn btn-sm btn-bad">Cancel unpaid order</Submit>
                      </OpForm>
                    </div>
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
