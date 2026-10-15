import Link from "next/link";
import { requireAdmin } from "@/core/auth";
import { callSite, type OpResult } from "@/core/ops";
import { portalSites, ROLE_LABEL } from "@/core/perms";
import { SITES, SITE_KEYS, type SiteKey } from "@/core/sites";
import { aud0 } from "@/ui/format";
import { Icon } from "@/ui/Icons";
import { PullToRefresh } from "@/ui/ux/PullToRefresh";
import { LiveButton } from "@/components/Section";
import type { CloSummary } from "@/core/clothing";

export const metadata = { title: "Overview" };

type WS = { revenue: { last30Cents: number }; orders: { now: number }; units: { now: number }; balances: { totalCents: number; overdue: number }; pending: { quotes: number; returns: number; businesses: number; total: number }; today: { totalCents: number } };
type EV = { revenue: { last30Cents: number }; orders: { now: number }; tickets: { now: number }; next: { id: string; name: string; startsAt: string; sold: number; capacity: number } | null; pending: { refunds: number; total: number }; today: { totalCents: number } };

/* All sites at a glance. Each card is read from that site's admin API on its own: if one site
   is down its card says so, and the others are unaffected. */
export default async function Overview() {
  const a = await requireAdmin();
  const sites = portalSites(a, SITE_KEYS);
  const results = Object.fromEntries(await Promise.all(sites.map(async (s) => [s, await callSite(a, s, "summary", {}, { timeoutMs: 4000 })] as const))) as Partial<Record<SiteKey, OpResult<unknown>>>;
  const ws = results.wholesale?.ok ? (results.wholesale.data as WS) : null;
  const ev = results.events?.ok ? (results.events.data as EV) : null;
  const clo = results.clothing?.ok ? (results.clothing.data as CloSummary) : null;
  const revenue = (clo?.revenue.last30Cents ?? 0) + (ws?.revenue.last30Cents ?? 0) + (ev?.revenue.last30Cents ?? 0);
  const waiting = (clo?.pending.total ?? 0) + (ws?.pending.total ?? 0) + (ev?.pending.total ?? 0);
  const answered = sites.filter((k) => results[k]?.ok).map((k) => SITES[k].short);
  const missing = sites.filter((k) => !results[k]?.ok).map((k) => SITES[k].short);

  return (
    <PullToRefresh>
      <div className="dash-head">
        <div><p className="eyebrow">Nepthic Admin Portal</p><h1>Overview</h1></div>
        <span className="role-pill">{ROLE_LABEL[a.role]}{a.role !== "SUPER" && ` · ${a.sites.map((s) => SITES[s as SiteKey]?.short ?? s).join(", ")}`}</span>
      </div>

      <div className="dash-stack" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
        <section className="dcard" data-glow><div className="stat-top"><span className="stat-label">Revenue · 30 days</span><span className="stat-ico"><Icon name="card" size={20} /></span></div>
          <span className="big">{aud0(revenue)}</span><span className="small dim">{answered.join(" + ") || "No sites answered"}{missing.length ? ` · ${missing.join(", ")} not included` : ""}</span></section>
        <section className="dcard" data-glow><div className="stat-top"><span className="stat-label">Waiting on the team</span><span className="stat-ico"><Icon name="inbox" size={20} /></span></div>
          <span className="big">{waiting}</span><span className="small dim">orders to ship, quotes, returns, trade accounts and refunds</span></section>
        {clo && <section className="dcard" data-glow style={{ ["--c" as string]: "var(--clo)" }}><div className="stat-top"><span className="stat-label">Retail orders · 7 days</span><span className="stat-ico"><Icon name="bag" size={20} /></span></div>
          <span className="big">{clo.orders.now}</span><span className="small dim">{clo.units.now.toLocaleString("en-AU")} items · {clo.toFulfil} to ship</span></section>}
        {ws && <section className="dcard" data-glow style={{ ["--c" as string]: "var(--ws)" }}><div className="stat-top"><span className="stat-label">Bulk orders · 7 days</span><span className="stat-ico"><Icon name="box" size={20} /></span></div>
          <span className="big">{ws.orders.now}</span><span className="small dim">{ws.units.now.toLocaleString("en-AU")} units</span></section>}
        {ev && <section className="dcard" data-glow style={{ ["--c" as string]: "var(--ev)" }}><div className="stat-top"><span className="stat-label">Tickets sold · 7 days</span><span className="stat-ico"><Icon name="ticket" size={20} /></span></div>
          <span className="big">{ev.tickets.now}</span><span className="small dim">{ev.orders.now} ticket orders</span></section>}
      </div>

      <div className="ov-sites">
        {sites.map((s) => {
          const r = results[s];
          const meta = SITES[s];
          return (
            <section key={s} className="dcard ov-site" data-glow style={{ ["--c" as string]: meta.cssVar, ["--glow-a" as string]: meta.accent }} aria-labelledby={`h-${s}`}>
              <div className="stat-top"><h2 className="h3" id={`h-${s}`}>{meta.short}</h2>
                {r?.ok ? <span className="pill ok">Live</span> : r?.kind === "not-connected" ? <span className="pill">Not connected</span> : <span className="pill warn">Unavailable</span>}</div>
              {!r?.ok ? <p className="muted small">{r?.error}</p> : s === "clothing" && clo ? (
                <div className="kv2">
                  <div><span>Revenue · 30 days</span><b>{aud0(clo.revenue.last30Cents)}</b></div>
                  <div><span>Today</span><b>{aud0(clo.today.totalCents)}</b></div>
                  <div><span>Orders to ship</span><b>{clo.toFulfil}</b></div>
                  <div><span>Low-stock sizes</span><b>{clo.lowStock.count}</b></div>
                </div>
              ) : s === "wholesale" && ws ? (
                <div className="kv2">
                  <div><span>Revenue · 30 days</span><b>{aud0(ws.revenue.last30Cents)}</b></div>
                  <div><span>Today</span><b>{aud0(ws.today.totalCents)}</b></div>
                  <div><span>Quotes waiting</span><b>{ws.pending.quotes}</b></div>
                  <div><span>Returns / accounts</span><b>{ws.pending.returns} / {ws.pending.businesses}</b></div>
                  <div><span>Balances owed</span><b>{aud0(ws.balances.totalCents)}</b></div>
                  <div><span>Overdue</span><b>{ws.balances.overdue}</b></div>
                </div>
              ) : s === "events" && ev ? (
                <div className="kv2">
                  <div><span>Revenue · 30 days</span><b>{aud0(ev.revenue.last30Cents)}</b></div>
                  <div><span>Today</span><b>{aud0(ev.today.totalCents)}</b></div>
                  <div><span>Refunds waiting</span><b>{ev.pending.refunds}</b></div>
                  <div><span>Next event</span><b style={{ fontSize: ".95rem" }}>{ev.next ? `${ev.next.name} · ${ev.next.sold}/${ev.next.capacity}` : "None"}</b></div>
                </div>
              ) : null}
              <div className="row">
                <Link className="go" href={`/${s}`}>Manage {meta.short} <span aria-hidden="true">›</span></Link>
                {(r?.ok || r?.kind !== "not-connected") && <LiveButton site={s} label="View live" />}
              </div>
            </section>
          );
        })}
      </div>
      {sites.length === 0 && <div className="empty">Your account isn&apos;t assigned to any site yet. Ask a Super Admin.</div>}
    </PullToRefresh>
  );
}
