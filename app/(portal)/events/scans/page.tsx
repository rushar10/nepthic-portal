import Link from "next/link";
import { admins, db, inArray } from "@/db";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { dateShort, time } from "@/ui/format";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { exportHref, sortEvents } from "@/components/EventPicker";

export const metadata = { title: "Door scans" };

/* The door log: every scan at one event, newest first, separated by event (upcoming and
   conducted). Shows what the door was told, where the ticket came from (online, box office or
   which partner), the gate, how it was scanned and who scanned it. Filters and a CSV download. */

type Scan = {
  id: string; at: string; result: string; gate: string; method: string; staff: string | null; typed: string | null;
  ticketCode: string | null; holder: string | null; status: string | null; format: string | null; source: string | null; type: string | null; zone: string | null;
  partnerName: string | null; partnerCode: string | null; partnerColor: string | null; partnerStatus: string | null;
};
type D = {
  event: { id: string; name: string; startsAt: string; gates: string[] }; total: number; byResult: Record<string, number>;
  gates: { gate: string; n: number }[]; partners: { id: string | null; name: string; code: string | null; color: string | null; admitted: number; refused: number }[];
  results: string[]; page: number; more: boolean; scans: Scan[];
};
type Sp = { event?: string; partner?: string; gate?: string; result?: string; method?: string; q?: string; page?: string };

const RESULT: Record<string, { label: string; tone: string }> = {
  ADMIT: { label: "Admitted", tone: "ok" }, ALREADY_USED: { label: "Already used", tone: "bad" }, FLAGGED: { label: "Flagged (supervisor)", tone: "warn" },
  INVALID: { label: "Invalid code", tone: "bad" }, FORGED: { label: "Forged QR", tone: "bad" }, VOID: { label: "Void ticket", tone: "bad" },
  REFUNDED: { label: "Refunded", tone: "bad" }, WRONG_EVENT: { label: "Wrong event", tone: "bad" },
};
const METHOD: Record<string, string> = { CAMERA: "Camera", MANUAL: "Typed", OFFLINE: "Offline (synced)" };
const SOURCE: Record<string, string> = { ONLINE: "Online", BOX_OFFICE: "Box office", PARTNER: "Partner" };

export default async function DoorScans({ searchParams }: { searchParams: Promise<Sp> }) {
  const a = await requireSite("events");
  const sp = await searchParams;
  const evs = await callSite<{ events: { id: string; name: string; startsAt: string }[] }>(a, "events", "events.list");
  const head = <SectionHead site="events" title="Door scans" livePath={null} sub="Every scan at the door, newest first: the result, where the ticket came from, the gate and who scanned it. Refused scans are included." />;
  if (!evs.ok) return <>{head}<SiteProblem site="events" r={evs} /></>;
  const list = sortEvents(evs.data.events);
  if (!list.length) return <>{head}<div className="empty">No events yet.</div></>;

  // Conducted (started) vs upcoming; open on the most recent event that has started.
  const now = Date.now();
  const conducted = list.filter((e) => new Date(e.startsAt).getTime() <= now).sort((x, y) => +new Date(y.startsAt) - +new Date(x.startsAt));
  const upcoming = list.filter((e) => new Date(e.startsAt).getTime() > now).sort((x, y) => +new Date(x.startsAt) - +new Date(y.startsAt));
  const current = sp.event && list.some((e) => e.id === sp.event) ? sp.event : (conducted[0] ?? upcoming[0]).id;

  const page = Math.max(1, Number(sp.page) || 1);
  const f = { partnerId: sp.partner ?? "", gate: sp.gate ?? "", result: sp.result ?? "", method: sp.method ?? "", q: (sp.q ?? "").slice(0, 60) };
  const r = await callSite<D>(a, "events", "scans.list", { eventId: current, ...f, page });
  const picker = (
    <div className="scan-events">
      {[["Conducted", conducted], ["Upcoming", upcoming]].map(([label, evList]) => (evList as typeof list).length > 0 && (
        <nav key={label as string} className="chips" aria-label={`${label} events`}>
          <span className="small dim scan-events-label">{label as string}</span>
          {(evList as typeof list).map((e) => (
            <Link key={e.id} className="tab" href={`/events/scans?event=${e.id}`} aria-current={e.id === current ? "page" : undefined}>
              {e.name} <span className="dim small">· {dateShort(e.startsAt)}</span>
            </Link>
          ))}
        </nav>
      ))}
    </div>
  );
  if (!r.ok) return <>{head}{picker}<SiteProblem site="events" r={r} /></>;
  const d = r.data;

  // Who scanned: the log stores the portal account id; show their name here.
  const ids = [...new Set(d.scans.map((s) => s.staff?.replace(/^portal:/, "")).filter((x): x is string => !!x && /^[0-9a-f-]{36}$/i.test(x)))];
  const staff = new Map((ids.length ? await db.select({ id: admins.id, name: admins.name, email: admins.email }).from(admins).where(inArray(admins.id, ids)) : []).map((x) => [x.id, x]));
  const who = (s: string | null) => { const x = s ? staff.get(s.replace(/^portal:/, "")) : null; return x ? x.name : s ? "Unknown or removed account" : "—"; };

  const qs = (patch: Partial<Sp>) => {
    const p = new URLSearchParams({ event: current, ...Object.fromEntries(Object.entries({ partner: f.partnerId, gate: f.gate, result: f.result, method: f.method, q: f.q }).filter(([, v]) => v)) });
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, v); else p.delete(k); }
    return `/events/scans?${p}`;
  };
  const admitted = d.byResult.ADMIT ?? 0, refused = d.total - admitted;
  const filtered = !!(f.partnerId || f.gate || f.result || f.method || f.q);
  const multiDay = new Set(d.scans.map((s) => dateShort(s.at))).size > 1;

  return (
    <>
      {head}
      {picker}

      <section className="panel prox" aria-label="Summary">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 className="h3">{d.event.name} <span className="dim small">· {dateShort(d.event.startsAt)}</span></h2>
          <a className="btn btn-sm prox" href={exportHref({ kind: "scans", eventId: current, partnerId: f.partnerId, gate: f.gate, result: f.result, method: f.method, q: f.q })} download>Download CSV{filtered ? " (filtered)" : ""}</a>
        </div>
        <div className="scan-stats">
          <div><b>{d.total}</b><span className="small dim">scans</span></div>
          <div><b className="ok-text">{admitted}</b><span className="small dim">admitted</span></div>
          <div><b className={refused ? "bad-text" : ""}>{refused}</b><span className="small dim">refused or flagged</span></div>
        </div>
        {d.total > 0 && (
          <div className="stage-row" aria-label="Scans by result">
            {Object.entries(d.byResult).sort((x, y) => y[1] - x[1]).map(([k, n]) => (
              <Link key={k} href={qs({ result: f.result === k ? "" : k, page: "" })} className={`pill ${RESULT[k]?.tone ?? ""}`} aria-current={f.result === k ? "true" : undefined}>{RESULT[k]?.label ?? k} · {n}</Link>
            ))}
          </div>
        )}
        {d.partners.length > 0 && (
          <div className="scan-partners" aria-label="Scans by source">
            {d.partners.map((p) => {
              const key = p.id ?? "none";
              return (
                <Link key={key} href={qs({ partner: f.partnerId === key ? "" : key, page: "" })} className="scan-partner" aria-current={f.partnerId === key ? "true" : undefined}>
                  {p.code ? <span className="partner-badge" style={{ background: p.color ?? undefined }}>{p.code}</span> : <span className="pill">Direct</span>}
                  <span className="small"><b>{p.name}</b><br /><span className="ok-text">{p.admitted} in</span>{p.refused > 0 && <> · <span className="bad-text">{p.refused} refused</span></>}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <form className="panel prox form-grid scan-filters" method="get" action="/events/scans">
        <input type="hidden" name="event" value={current} />
        <label className="f">Ticket code or name<input type="search" name="q" defaultValue={f.q} placeholder="NEP03-… or name" /></label>
        <label className="f">Source
          <select name="partner" defaultValue={f.partnerId}>
            <option value="">Any</option><option value="none">Online and box office (no partner)</option>
            {d.partners.filter((p) => p.id).map((p) => <option key={p.id!} value={p.id!}>{p.code} · {p.name}</option>)}
          </select>
        </label>
        <label className="f">Result
          <select name="result" defaultValue={f.result}>
            <option value="">Any</option><option value="refused">Refused or flagged only</option>
            {d.results.map((k) => <option key={k} value={k}>{RESULT[k]?.label ?? k}</option>)}
          </select>
        </label>
        <label className="f">Gate
          <select name="gate" defaultValue={f.gate}><option value="">Any</option>{d.gates.map((g) => <option key={g.gate} value={g.gate}>{g.gate} ({g.n})</option>)}</select>
        </label>
        <label className="f">How
          <select name="method" defaultValue={f.method}><option value="">Any</option>{Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <div className="row" style={{ alignSelf: "end" }}>
          <button className="btn btn-sm btn-primary">Filter</button>
          {filtered && <Link className="btn btn-sm btn-ghost" href={`/events/scans?event=${current}`}>Clear</Link>}
        </div>
      </form>

      <section className="panel prox" aria-label="Scans">
        {d.scans.length === 0 ? (
          <div className="empty">{d.total === 0 ? "No scans at this event yet. They appear here as the door scans tickets." : "No scans match these filters."}</div>
        ) : (
          <div className="scroll"><table className="tbl rtable scan-log">
            <thead><tr><th>Time</th><th>Result</th><th>Ticket</th><th>Source</th><th>Gate</th><th>How</th><th>Scanned by</th></tr></thead>
            <tbody>
              {d.scans.map((s) => (
                <tr key={s.id}>
                  <td data-label="Time" className="nowrap">{multiDay && <span className="dim small">{dateShort(s.at)} </span>}{time(s.at)}</td>
                  <td data-label="Result"><span className={`pill ${RESULT[s.result]?.tone ?? ""}`}>{RESULT[s.result]?.label ?? s.result}</span></td>
                  <td data-label="Ticket">
                    {s.ticketCode ? <Link href={`/events/tickets?q=${encodeURIComponent(s.ticketCode)}`} className="mono">{s.ticketCode}</Link> : <span className="mono dim">{s.typed ?? "Unreadable QR"}</span>}
                    {(s.holder || s.type) && <div className="small dim">{[s.holder && !/^physical ticket$/i.test(s.holder) ? s.holder : null, s.type, s.zone].filter(Boolean).join(" · ")}</div>}
                  </td>
                  <td data-label="Source">
                    {s.partnerCode ? <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}><span className="partner-badge" style={{ background: s.partnerColor ?? undefined }}>{s.partnerCode}</span><span className="small">{s.partnerName}{s.partnerStatus === "SUSPENDED" ? " (suspended)" : ""}</span></span>
                      : s.source ? <span className="small">{SOURCE[s.source] ?? s.source}</span> : <span className="small dim">Unknown ticket</span>}
                    {s.format && s.format !== "ETICKET" && <div className="small dim">{s.format === "BOTH" ? "E-ticket + printed" : "Printed"}</div>}
                  </td>
                  <td data-label="Gate">{s.gate}</td>
                  <td data-label="How" className="small">{METHOD[s.method] ?? s.method}</td>
                  <td data-label="Scanned by" className="small">{who(s.staff)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        {(d.page > 1 || d.more) && (
          <nav className="row" aria-label="Pages" style={{ justifyContent: "space-between" }}>
            {d.page > 1 ? <Link className="btn btn-sm btn-ghost" href={qs({ page: String(d.page - 1) })}>← Newer</Link> : <span />}
            <span className="small dim">Page {d.page}</span>
            {d.more ? <Link className="btn btn-sm btn-ghost" href={qs({ page: String(d.page + 1) })}>Older →</Link> : <span />}
          </nav>
        )}
      </section>
    </>
  );
}
