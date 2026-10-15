import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { aud, time } from "@/ui/format";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { EventPicker, exportHref, PARTNER_TABS, SubTabs, sortEvents } from "@/components/EventPicker";

export const metadata = { title: "Partner reports" };

type Line = { key: string; label: string; code: string | null; color: string; allocated: number; issued: number; sold: number; unsold: number; scanned: number; noShows: number | null; physical: number; revenueCents: number; commissionPct: number; commissionCents: number };
type R = {
  event: { id: string; name: string; startsAt: string; past: boolean }; lines: Line[];
  totals: { sold: number; scanned: number; revenueCents: number; commissionCents: number };
  timeline: ({ at: string } & Record<string, number | string>)[]; gates: ({ at: string } & Record<string, number | string>)[]; gateNames: string[];
  scanResults: { result: string; n: number }[]; alerts: { level: "warn" | "bad"; text: string }[];
};
const GATE_COLOURS = ["#EC4899", "#38BDF8", "#F59E0B", "#22C55E", "#A78BFA", "#F43F5E"];
const RESULT: Record<string, string> = { ADMIT: "Admitted", ALREADY_USED: "Already used", INVALID: "Invalid code", FORGED: "Forged QR", VOID: "Void ticket", FLAGGED: "Flagged (supervisor)", WRONG_EVENT: "Wrong event", REFUNDED: "Refunded" };

/** Stacked bars: admissions per 15 minutes, one colour per series. */
function Stacked({ rows, series, label }: { rows: ({ at: string } & Record<string, number | string>)[]; series: { key: string; label: string; color: string }[]; label: string }) {
  if (!rows.length) return <p className="dim small">No scans yet.</p>;
  const W = 720, H = 200, pad = 28, bw = Math.max(4, Math.min(28, (W - pad * 2) / rows.length - 4));
  const total = (r: Record<string, unknown>) => series.reduce((n, s) => n + Number(r[s.key] ?? 0), 0);
  const max = Math.max(1, ...rows.map(total));
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H + 24}`} width="100%" role="img" aria-label={label} style={{ maxWidth: "100%" }}>
        {[0, 0.5, 1].map((g) => <g key={g}><line x1={pad} x2={W - 6} y1={H - (H - 12) * g} y2={H - (H - 12) * g} stroke="currentColor" opacity=".12" /><text x={pad - 6} y={H - (H - 12) * g + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity=".6">{Math.round(max * g)}</text></g>)}
        {rows.map((r, i) => {
          let y = H;
          const x = pad + i * ((W - pad * 2) / rows.length) + 2;
          return (
            <g key={r.at}>
              {series.map((s) => { const v = Number(r[s.key] ?? 0); const h = (v / max) * (H - 12); y -= h; return v ? <rect key={s.key} x={x} y={y} width={bw} height={h} rx="2" fill={s.color}><title>{`${time(r.at)} · ${s.label}: ${v}`}</title></rect> : null; })}
              {i % Math.ceil(rows.length / 8) === 0 && <text x={x + bw / 2} y={H + 16} textAnchor="middle" fontSize="10" fill="currentColor" opacity=".7">{time(r.at)}</text>}
            </g>
          );
        })}
      </svg>
      <figcaption className="row small" style={{ gap: 12 }}>{series.map((s) => <span key={s.key} className="row" style={{ gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block" }} />{s.label}</span>)}</figcaption>
    </figure>
  );
}

export default async function Reports({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const a = await requireSite("events");
  const { event } = await searchParams;
  const evs = await callSite<{ events: { id: string; name: string; startsAt: string }[] }>(a, "events", "events.list");
  const list = evs.ok ? sortEvents(evs.data.events) : [];
  const current = event ?? list[0]?.id;
  const r = current ? await callSite<R>(a, "events", "partners.report", { eventId: current }) : null;
  const head = (
    <SectionHead site="events" title="Partner reports" livePath={null} sub="Allocated, sold, unsold, scanned and no-shows for each partner, with revenue and commission owed. Updates live as tickets sell and get scanned.">
      <SubTabs items={PARTNER_TABS} current="/events/reports" />
    </SectionHead>
  );
  if (!evs.ok) return <>{head}<SiteProblem site="events" r={evs} /></>;
  if (!r) return <>{head}<div className="empty">No events yet.</div></>;
  if (!r.ok) return <>{head}<EventPicker events={list} current={current} path="/events/reports" /><SiteProblem site="events" r={r} /></>;
  const d = r.data;
  const sources = d.lines.map((l) => ({ key: l.key, label: l.code ? `${l.label} (${l.code})` : l.label, color: l.color }));
  const gates = d.gateNames.map((g, i) => ({ key: g, label: g, color: GATE_COLOURS[i % GATE_COLOURS.length] }));

  return (
    <>
      {head}
      <EventPicker events={list} current={current} path="/events/reports" />
      <div className="row">
        <a className="btn btn-sm prox" href={exportHref({ kind: "report", eventId: d.event.id, format: "csv" })} download>Export CSV</a>
        <a className="btn btn-sm btn-ghost" href={exportHref({ kind: "report", eventId: d.event.id, format: "pdf" })} download>Export PDF</a>
      </div>
      {d.alerts.length > 0 && (
        <section className="panel prox" aria-labelledby="t-alerts">
          <h2 className="h3" id="t-alerts">Alerts</h2>
          <ul className="alert-list">{d.alerts.map((x, i) => <li key={i} className={x.level}>{x.text}</li>)}</ul>
        </section>
      )}
      <section className="panel prox">
        <div className="scroll"><table className="tbl rtable">
          <thead><tr><th>Source</th><th className="num">Allocated</th><th className="num">Sold</th><th className="num">Unsold</th><th className="num">Scanned</th><th className="num">No-shows</th><th className="num">Revenue</th><th className="num">Commission</th></tr></thead>
          <tbody>
            {d.lines.map((l) => (
              <tr key={l.key}>
                <td><span className="row" style={{ gap: 8 }}>{l.code ? <span className="partner-badge" style={{ background: l.color }}>{l.code}</span> : <i style={{ width: 10, height: 10, borderRadius: 3, background: l.color, display: "inline-block" }} />}<b>{l.label}</b></span>{l.physical > 0 && <div className="small dim">{l.physical} physical</div>}</td>
                <td className="num" data-label="Allocated">{l.allocated || "—"}</td>
                <td className="num" data-label="Sold">{l.sold}</td>
                <td className="num" data-label="Unsold">{l.allocated ? l.unsold : "—"}</td>
                <td className="num" data-label="Scanned">{l.scanned}</td>
                <td className="num" data-label="No-shows">{l.noShows ?? "after the event"}</td>
                <td className="num" data-label="Revenue">{aud(l.revenueCents)}</td>
                <td className="num" data-label="Commission">{l.commissionCents ? `${aud(l.commissionCents)} (${l.commissionPct}%)` : "—"}</td>
              </tr>
            ))}
            <tr><td><b>Total</b></td><td /><td className="num"><b>{d.totals.sold}</b></td><td /><td className="num"><b>{d.totals.scanned}</b></td><td /><td className="num"><b>{aud(d.totals.revenueCents)}</b></td><td className="num"><b>{aud(d.totals.commissionCents)}</b></td></tr>
          </tbody>
        </table></div>
      </section>
      <div className="cards-2">
        <section className="panel prox"><h2 className="h3">Entry timeline by source</h2><Stacked rows={d.timeline} series={sources} label="Check-ins per 15 minutes by ticket source" /></section>
        <section className="panel prox"><h2 className="h3">Entry timeline by gate</h2><Stacked rows={d.gates} series={gates} label="Check-ins per 15 minutes by gate" /></section>
      </div>
      {d.scanResults.length > 0 && (
        <section className="panel prox"><h2 className="h3">Door scans</h2>
          <div className="stage-row">{d.scanResults.sort((x, y) => y.n - x.n).map((x) => <span key={x.result} className={`pill ${x.result === "ADMIT" ? "ok" : x.result === "FLAGGED" ? "warn" : "bad"}`}>{RESULT[x.result] ?? x.result} · {x.n}</span>)}</div>
        </section>
      )}
    </>
  );
}
