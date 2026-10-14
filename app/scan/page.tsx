import Link from "next/link";
import { requireAdmin } from "@/core/auth";
import { callSite } from "@/core/ops";
import { dateShort, time } from "@/ui/format";
import { AppShell } from "@/ui/ux/AppShell";
import { Scanner } from "./Scanner";

export const metadata = { title: "Scanner" };

type E = { id: string; name: string; startsAt: string; venue: string; issued: number; used: number };

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const a = await requireAdmin({ allowDoor: true });
  const { event } = await searchParams;
  const r = await callSite<{ events: E[] }>(a, "events", "checkin.events", {}, { level: "door" });
  if (!r.ok) return <div className="note warn" role="status">{r.error} If you already downloaded this event&apos;s ticket list, reopen the event from your history to scan offline.</div>;
  const list = r.data.events;
  const current = list.find((e) => e.id === event) ?? list[0];
  if (!current) return <div className="empty">No published events today or coming up.</div>;
  return (
    <AppShell>
      <div className="stack">
        <div className="hero" style={{ paddingBottom: 0 }}>
          <p className="eyebrow">Door scanner · {a.name}</p>
          <h1 className="page">Check-in</h1>
        </div>
        <nav className="chips" aria-label="Event">
          {list.map((e) => <Link key={e.id} className="tab" href={`/scan?event=${e.id}`} aria-current={e.id === current.id ? "page" : undefined}>{e.name} · {dateShort(e.startsAt)}</Link>)}
        </nav>
        <Scanner eventId={current.id} eventName={`${current.name} · doors ${time(current.startsAt)}`} issued={current.issued} admitted={current.used} />
      </div>
    </AppShell>
  );
}
