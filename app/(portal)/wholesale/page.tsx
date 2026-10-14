import Link from "next/link";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { PullToRefresh } from "@/ui/ux/PullToRefresh";
import { aud0, dateShort } from "@/ui/format";
import { Card, Change, StatCard, accentVars } from "@/components/admin/dash/Card";
import { BarChart } from "@/components/admin/dash/BarChart";
import { DonutChart } from "@/components/admin/dash/DonutChart";
import { ActivityList } from "@/components/admin/dash/ActivityList";
import { Sparkline } from "@/components/admin/dash/Sparkline";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Wholesale" };

const WS = "var(--ws)";
const SEGMENT_COLOURS = ["#2DD4BF", "#8B5CF6", "#99F6E4", "#6E6680"];
const ACT = {
  order: { icon: "box", color: WS, label: "Bulk order" },
  quote: { icon: "chat", color: "var(--brand)", label: "Quote" },
  return: { icon: "undo", color: "var(--warn)", label: "Return" },
} as const;
const changePct = (now: number, prev: number) => (prev > 0 ? Math.round(((now - prev) / prev) * 100) : now > 0 ? null : 0);

type D = {
  months: { key: string; label: string; long: string; value: number }[];
  byStockist: { label: string; value: number }[];
  week: { orders: { now: number; prev: number }; units: { now: number; prev: number } };
  balances: { total: number; count: number; overdue: number; next: { number: number; name: string; owed: number; due: string | null } | null };
  activity: { id: string; kind: "order" | "quote" | "return"; who: string; detail: string; amount: number | null; at: string }[];
  today: { hours: number[]; total: number; yesterday: number };
  approvals: { quotes: number; returns: number; businesses: number; total: number };
};

export default async function WholesaleDashboard() {
  const a = await requireSite("wholesale");
  const r = await callSite<D>(a, "wholesale", "dashboard");
  if (!r.ok) return <><SectionHead site="wholesale" title="Wholesale Dashboard" /><SiteProblem site="wholesale" r={r} /></>;
  const { months, byStockist, week: wk, balances: bal, activity, today, approvals: appr } = r.data;
  const bars = months.map((m) => ({ key: m.key, label: m.label, long: m.long, value: m.value }));
  const thisMonth = bars[bars.length - 1].value, lastMonth = bars[bars.length - 2].value;
  const segments = byStockist.map((e, i) => ({ key: e.label, label: e.label, color: SEGMENT_COLOURS[i] ?? "#6E6680", value: e.value }));
  const queues = [
    { label: "Quote requests", n: appr.quotes },
    { label: "Returns", n: appr.returns },
    { label: "Trade accounts", n: appr.businesses },
  ];

  return (
    <PullToRefresh>
      <SectionHead site="wholesale" title="Wholesale Dashboard" livePath="/catalogue" />
      <div className="dash-grid">
        <div className="dash-main">
          <Card className="o-flow" title="Revenue Flow" id="t-flow" accent={WS}
            action={<Link className="more" href="/wholesale/payments">View All <span aria-hidden="true">›</span></Link>}>
            <div className="stat-foot" style={{ marginTop: -6 }}>
              <span className="big" style={{ fontSize: "1.6rem", color: "var(--fg)" }}>{aud0(thisMonth)}</span>
              <Change pct={changePct(thisMonth, lastMonth)} />
              <span>wholesale revenue this month vs last</span>
            </div>
            <BarChart data={bars} color={WS} label="Monthly net wholesale revenue, last 12 months. Use tab to read each month." />
          </Card>
          <div className="dash-row">
            <Card className="o-donut" title="Revenue by Stockist" id="t-st" action={<span className="small dim">Last 30 days</span>}>
              {segments.length ? <DonutChart segments={segments} /> : <p className="muted">No wholesale payments in the last 30 days.</p>}
            </Card>
            <div className="dash-stack o-stats">
              <StatCard label="Bulk orders" icon="box" accent={WS} href="/wholesale/orders" value={wk.orders.now.toLocaleString("en-AU")}
                pct={changePct(wk.orders.now, wk.orders.prev)} note="orders placed · 7 days" />
              <StatCard label="Units ordered" icon="shirt" accent={WS} href="/wholesale/orders" value={wk.units.now.toLocaleString("en-AU")}
                pct={changePct(wk.units.now, wk.units.prev)} note="garments · 7 days" />
            </div>
          </div>
        </div>

        <div className="dash-side">
          <section className="stack-card o-next" aria-labelledby="t-bal">
            <div className="ev-top" data-glow style={accentVars("brand")}>
              <div className="row1"><div>
                <span className="kicker" id="t-bal">Balances due · {bal.count} order{bal.count === 1 ? "" : "s"}{bal.overdue ? ` · ${bal.overdue} overdue` : ""}</span>
                <h3>{aud0(bal.total)}</h3>
              </div></div>
              {bal.next ? (
                <>
                  <span className="meta">Next: #{bal.next.number} · {bal.next.name} · {aud0(bal.next.owed)}{bal.next.due ? ` due ${dateShort(bal.next.due)}` : ""}</span>
                  <Link href="/wholesale/orders" style={{ color: "#fff", fontWeight: 700, fontSize: ".88rem" }}>Open orders <span aria-hidden="true">›</span></Link>
                </>
              ) : <span className="meta">No deposit orders are waiting on a balance.</span>}
            </div>
          </section>
          <Card className="o-act" title="Recent Activity" id="t-act" action={<Link className="more" href="/wholesale/orders">View All <span aria-hidden="true">›</span></Link>}>
            <ActivityList items={activity.map((x) => ({ ...x, at: new Date(x.at), ...ACT[x.kind] }))} />
          </Card>
          <div className="dash-pair">
            <Card className="o-appr" title="Pending Approvals" id="t-appr">
              <ul className="appr">{queues.map((q) => <li key={q.label}><span>{q.label}</span><b className={q.n ? "has" : undefined}>{q.n}</b></li>)}</ul>
              <Link className="btn-pill" href="/wholesale/approvals">Review{appr.total ? ` ${appr.total}` : ""}</Link>
            </Card>
            <Card className="o-live" title="Live Sales" id="t-live" accent={WS}>
              <div>
                <span className="big" style={{ fontSize: "1.5rem" }}>{aud0(today.total)}</span>
                <div className="small muted">today{today.yesterday ? ` · ${aud0(today.yesterday)} by now yesterday` : ""}</div>
              </div>
              <Sparkline values={today.hours} label={`Wholesale takings today by hour: ${aud0(today.total)} so far`} />
            </Card>
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}
