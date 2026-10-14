import Link from "next/link";
import { requireAdmin } from "@/core/auth";
import { navFor, type Section } from "@/core/nav";
import { portalSites, ROLE_LABEL } from "@/core/perms";
import { SITES, SITE_KEYS } from "@/core/sites";
import { Icon } from "@/ui/Icons";
import { logout } from "@/app/login/actions";

export const metadata = { title: "Menu" };

/* The phone "More" tab: everything in the current section, the other sites, and your account. */
export default async function More({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const a = await requireAdmin();
  const nav = navFor(a, {});
  const s = ((await searchParams).s ?? "portal") as Section;
  const items = nav[s] ?? nav.portal;
  return (
    <>
      <div className="row panel prox" style={{ display: "flex" }}>
        <div className="avatar" aria-hidden="true">{a.name[0]}</div>
        <div><b>{a.name}</b><div className="small dim">{a.email} · {ROLE_LABEL[a.role]}</div></div>
      </div>
      <nav className="drawer-sites" aria-label="This section">
        {items.map((i) => <Link key={i.href} href={i.href}><Icon name={i.icon} /><span style={{ flex: 1 }}><b>{i.label}</b></span></Link>)}
      </nav>
      <nav className="drawer-sites" aria-label="Sites">
        <Link href="/"><Icon name="chart" /><b>Overview (all sites)</b></Link>
        {portalSites(a, SITE_KEYS).map((k) => <Link key={k} href={`/${k}`}><span className="site-dot" style={{ background: SITES[k].accent, width: 12, height: 12 }} /><b>{SITES[k].short}</b></Link>)}
        {nav.portal.filter((i) => i.href !== "/").map((i) => <Link key={i.href} href={i.href}><Icon name={i.icon} /><b>{i.label}</b></Link>)}
      </nav>
      <form action={logout}><button className="btn" type="submit">Sign out</button></form>
    </>
  );
}
