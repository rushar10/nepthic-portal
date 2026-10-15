"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { Icon } from "@/ui/Icons";
export type RailItem = { href: string; label: string; icon: string; badge?: number; match?: string[] };

const isOn = (path: string, i: RailItem) =>
  i.match?.length === 0 ? path === i.href : path === i.href || path.startsWith(`${i.href}/`) || !!i.match?.some((m) => path === m || path.startsWith(`${m}/`));

/** Floating icon sidebar. Active item is a filled circle; labels show as tooltips on hover and focus.
    When a section has more items than fit the window, the rail scrolls on its own (the page
    doesn't have to). The tooltip lives outside the scrolling list so it is never clipped. */
export function Rail({ main, admin, logout }: { main: RailItem[]; admin: RailItem[]; logout: () => Promise<void> }) {
  const path = usePathname();
  const list = useRef<HTMLElement>(null);
  const [tip, setTip] = useState<{ label: string; y: number } | null>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const measure = () => {
    const n = list.current;
    if (!n) return;
    setEdges({ top: n.scrollTop > 2, bottom: n.scrollTop + n.clientHeight < n.scrollHeight - 2 });
  };
  useEffect(() => {
    const n = list.current;
    if (!n) return;
    // Keep the current page's item in view (it may be far down a long section).
    n.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(n);
    return () => ro.disconnect();
  }, [path, main.length, admin.length]);

  const show = (label: string) => (e: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    const n = list.current!, r = e.currentTarget.getBoundingClientRect(), base = n.parentElement!.getBoundingClientRect();
    setTip({ label, y: r.top - base.top + r.height / 2 });
  };
  const hide = () => setTip(null);

  const item = (i: RailItem) => (
    <Link key={i.href} href={i.href} className="rail-item" aria-label={i.badge ? `${i.label}, ${i.badge} waiting` : i.label} aria-current={isOn(path, i) ? "page" : undefined}
      onPointerEnter={show(i.label)} onPointerLeave={hide} onFocus={show(i.label)} onBlur={hide}>
      <Icon name={i.icon} />
      {!!i.badge && <span className="rail-badge" aria-hidden="true">{i.badge > 99 ? "99+" : i.badge}</span>}
    </Link>
  );
  return (
    <div className="adm-rail-col">
      <nav ref={list} className={`adm-rail${edges.top ? " more-up" : ""}${edges.bottom ? " more-down" : ""}`} aria-label="Admin sections" onScroll={() => { hide(); measure(); }}>
        {main.map(item)}
        {admin.length > 0 && <hr />}
        {admin.map(item)}
        <span className="rail-spacer" />
        <form action={logout}>
          <button type="submit" className="rail-item" aria-label="Sign out" onPointerEnter={show("Sign out")} onPointerLeave={hide} onFocus={show("Sign out")} onBlur={hide}>
            <Icon name="logout" />
          </button>
        </form>
      </nav>
      {tip && <span className="rail-tip on" aria-hidden="true" style={{ top: tip.y }}>{tip.label}</span>}
    </div>
  );
}
