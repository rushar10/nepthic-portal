"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rail } from "@/components/admin/Rail";
import { BottomNav } from "@/ui/Mobile";
import type { NavItem, Section } from "@/core/nav";

const SITE_SECTIONS = ["clothing", "wholesale", "events"];
export const sectionOf = (path: string): Section => {
  const first = path.split("/")[1] ?? "";
  return (SITE_SECTIONS.includes(first) ? first : "portal") as Section;
};

type Sw = { key: string; href: string; label: string; color: string; strong: string; n: number };

/** Overview · Clothing · Wholesale · Events — only the sites this person can manage. */
export function SiteSwitcher({ items, className = "switcher" }: { items: Sw[]; className?: string }) {
  const section = sectionOf(usePathname());
  return (
    <nav className={className} aria-label="Switch site">
      {items.map((s) => (
        <Link key={s.key} href={s.href} aria-current={section === s.key ? "page" : undefined} style={{ ["--c" as string]: s.color, ["--c-strong" as string]: s.strong }}>
          <i aria-hidden="true" />{s.label}{s.n > 0 && <span className="n" aria-label={`${s.n} waiting`}>{s.n}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** The floating icon rail for whichever section you're in. */
export function PortalRail({ nav, logout }: { nav: Record<Section, NavItem[]>; logout: () => Promise<void> }) {
  const items = nav[sectionOf(usePathname())] ?? nav.portal;
  return <Rail main={items.filter((i) => i.group !== "admin")} admin={items.filter((i) => i.group === "admin")} logout={logout} />;
}

/** Phones: the section's first four places, plus More (everything else, other sites, sign out). */
export function PortalBottomNav({ nav }: { nav: Record<Section, NavItem[]> }) {
  const section = sectionOf(usePathname());
  const items = nav[section] ?? nav.portal;
  const first = items.slice(0, 4).map((i) => ({ href: i.href, label: i.label.replace(/^(Wholesale|Events|Clothing) /, "").replace(" & enquiries", "").replace("Refund approvals", "Refunds").replace("Return approvals", "Returns").replace("Events & tickets", "Events").replace("Products & stock", "Products"), icon: i.icon, badge: i.badge, match: i.match }));
  return <BottomNav label="Admin" items={[...first, { href: `/more?s=${section}`, label: "More", icon: "menu" }]} />;
}
