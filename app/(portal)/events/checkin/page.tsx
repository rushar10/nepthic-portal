import Link from "next/link";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { dateLong, time } from "@/ui/format";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Check-in" };

type E = { id: string; name: string; startsAt: string; venue: string; issued: number; used: number; last: string | null };

export default async function Checkin() {
  const a = await requireSite("events");
  const r = await callSite<{ events: E[] }>(a, "events", "checkin.events", {}, { level: "door" });
  return (
    <>
      <SectionHead site="events" title="Check-in" livePath={null} sub="Scanning happens in the portal's scanner (admin.nepthic.com/scan). Door staff accounts can open only the scanner." />
      {!r.ok ? <SiteProblem site="events" r={r} /> : r.data.events.length === 0 ? <div className="empty">No events today or coming up.</div> : (
        <div className="cards">
          {r.data.events.map((e) => {
            const pct = e.issued ? Math.round((e.used / e.issued) * 100) : 0;
            return (
              <article key={e.id} className="card prox">
                <div className="spread">
                  <div><b>{e.name}</b><div className="small dim">{dateLong(e.startsAt)} · doors {time(e.startsAt)} · {e.venue}</div></div>
                  <Link className="btn btn-primary btn-sm prox" href={`/scan?event=${e.id}`}>Open scanner</Link>
                </div>
                <div className="bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
                <div className="spread small"><span><b className="mono">{e.used}</b> of {e.issued} admitted ({pct}%)</span>
                  <span className="dim">{e.last ? `Last scan ${time(e.last)}` : "No scans yet"} · <Link href={`/events/events/${e.id}`}>Attendee list</Link></span></div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
