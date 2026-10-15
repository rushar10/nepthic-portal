import Link from "next/link";
import { dateShort } from "@/ui/format";

export type EvLite = { id: string; name: string; startsAt: string | Date };

/** Event chips for screens that work on one event at a time (?event=…). */
export function EventPicker({ events, current, path, extra = "" }: { events: EvLite[]; current?: string; path: string; extra?: string }) {
  return (
    <nav className="chips" aria-label="Event" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {events.map((e) => (
        <Link key={e.id} className="tab" href={`${path}?event=${e.id}${extra}`} aria-current={e.id === current ? "page" : undefined}>
          {e.name} <span className="dim small">· {dateShort(e.startsAt)}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Upcoming events first (soonest first), then past ones (latest first). */
export function sortEvents<T extends EvLite>(list: T[]) {
  const now = Date.now();
  const up = list.filter((e) => new Date(e.startsAt).getTime() >= now - 6 * 3600e3).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = list.filter((e) => new Date(e.startsAt).getTime() < now - 6 * 3600e3).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  return [...up, ...past];
}

export const exportHref = (p: Record<string, string>) => `/exports/events?${new URLSearchParams(p)}`;

export function SubTabs({ items, current }: { items: { href: string; label: string }[]; current: string }) {
  return (
    <nav className="row" aria-label="Section">
      {items.map((i) => <Link key={i.href} className="tab" href={i.href} aria-current={i.href === current ? "page" : undefined}>{i.label}</Link>)}
    </nav>
  );
}

export const PARTNER_TABS = [{ href: "/events/partners", label: "Partners" }, { href: "/events/allocations", label: "Allocations" }, { href: "/events/reports", label: "Reports" }];
