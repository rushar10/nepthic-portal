import Link from "next/link";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { aud, aud0, dateShort, time } from "@/ui/format";
import { PullToRefresh } from "@/ui/ux/PullToRefresh";
import { Card, StatCard } from "@/components/admin/dash/Card";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { ORDER_LABEL, type CloSummary } from "@/core/clothing";

export const metadata = { title: "Clothing" };

const CLO = "var(--clo)";
const changePct = (now: number, prev: number) => (prev > 0 ? Math.round(((now - prev) / prev) * 100) : now > 0 ? null : 0);

/* Clothing at a glance, read from the Clothing store's admin API (clothing-kit). */
export default async function ClothingDashboard() {
  const a = await requireSite("clothing");
  const r = await callSite<CloSummary>(a, "clothing", "summary");
  if (!r.ok) return <><SectionHead site="clothing" title="Clothing Dashboard" /><SiteProblem site="clothing" r={r} /></>;
  const s = r.data;
  return (
    <PullToRefresh>
      <SectionHead site="clothing" title="Clothing Dashboard" sub="The retail store. Products, stock, orders and discounts here change the live store straight away." />
      <div className="dash-stack" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
        <StatCard label="Revenue · 30 days" icon="card" accent={CLO} href="/clothing/orders?show=all" value={aud0(s.revenue.last30Cents)}
          pct={changePct(s.revenue.last30Cents, s.revenue.prev30Cents)} note={`after refunds · today ${aud0(s.today.totalCents)}`} />
        <StatCard label="Orders · 7 days" icon="bag" accent={CLO} href="/clothing/orders?show=all" value={s.orders.now.toLocaleString("en-AU")}
          pct={changePct(s.orders.now, s.orders.prev)} note={`${s.units.now} items sold`} />
        <StatCard label="To ship" icon="box" accent={CLO} href="/clothing/orders" value={String(s.toFulfil)}
          note={s.oldestOpenAt ? `oldest from ${dateShort(s.oldestOpenAt)} ${time(s.oldestOpenAt)}` : "all caught up"} />
        <StatCard label="Low stock" icon="layers" accent={CLO} href="/clothing/inventory" value={String(s.lowStock.count)}
          note={`sizes at ${s.lowStock.threshold} or fewer`} />
      </div>
      <div className="cards-2">
        <Card title="Latest orders" id="t-recent" accent={CLO} action={<Link className="more" href="/clothing/orders?show=all">All orders <span aria-hidden="true">›</span></Link>}>
          <ul className="plain-list">
            {s.recent.map((o) => (
              <li key={o.id} className="spread">
                <span><b className="mono">{o.number}</b> <span className="dim small">{o.customerName} · {dateShort(o.createdAt)}</span></span>
                <span className="row"><span className={`pill ${ORDER_LABEL[o.status][1]}`}>{ORDER_LABEL[o.status][0]}</span><span className="mono">{aud(o.totalCents)}</span></span>
              </li>
            ))}
            {s.recent.length === 0 && <li className="dim">No orders yet.</li>}
          </ul>
        </Card>
        <Card title="Running low" id="t-low" accent={CLO} action={<Link className="more" href="/clothing/inventory">Restock <span aria-hidden="true">›</span></Link>}>
          <ul className="plain-list">
            {s.lowStock.items.map((v) => (
              <li key={v.sku} className="spread">
                <span><b>{v.name}</b> <span className="dim small">{v.size} · {v.sku}</span></span>
                <span className={`pill ${v.stock === 0 ? "bad" : "warn"}`}>{v.stock === 0 ? "Sold out" : `${v.stock} left`}</span>
              </li>
            ))}
            {s.lowStock.items.length === 0 && <li className="dim">Every size is above {s.lowStock.threshold}.</li>}
          </ul>
        </Card>
      </div>
      <p className="small dim">{s.products.active} products live · {s.products.draft} draft{s.products.draft === 1 ? "" : "s"}. <Link href="/clothing/products">Manage products</Link></p>
    </PullToRefresh>
  );
}
