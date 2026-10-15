import { env } from "@/core/env";
import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdmin } from "@/core/auth";
import { callSite } from "@/core/ops";
import { portalSites } from "@/core/perms";
import { SITE_KEYS, siteConnected, type SiteKey } from "@/core/sites";
import { navFor, switcherItems, type Counts } from "@/core/nav";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { PortalBottomNav, PortalRail, SiteSwitcher } from "@/components/PortalNav";
import { AppShell } from "@/ui/ux/AppShell";
import { Proximity } from "@/ui/Proximity";
import { Icon } from "@/ui/Icons";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";

/* The signed-in portal: top bar with the site switcher, a floating icon rail for the section
   you're in, and a bottom bar on phones. Door staff never get here (they go to /scan). */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const a = await requireAdmin();
  const sites = portalSites(a, SITE_KEYS);
  // Waiting-for-a-decision counts for the badges. A site that's down simply shows no badge.
  const counts: Counts = {};
  await Promise.all(sites.filter(siteConnected).map(async (s: SiteKey) => {
    const r = await callSite<{ total: number }>(a, s, "counts", {}, { timeoutMs: 1500 });
    if (r.ok) counts[s] = r.data;
  }));
  const nav = navFor(a, counts);
  const sw = switcherItems(sites, counts);
  const waiting = Object.values(counts).reduce((n, c) => n + (c?.total ?? 0), 0);
  const theme = (await cookies()).get("nep_portal_theme")?.value === "light" ? "light" : "dark";
  const first = a.name.split(" ")[0];

  return (
    <AppShell>
      <header className="adm-top">
        <Link className="adm-logo" href="/" aria-label="Nepthic Admin Portal: overview">
          <span className="mark" aria-hidden="true">N</span>
          <span>NEPTHIC</span>
          <span className="tag">ADMIN PORTAL</span>
        </Link>
        <SiteSwitcher items={sw} />
        <div className="adm-actions">
          <Link className="round" href="/" aria-label={waiting ? `${waiting} things waiting for a decision` : "Nothing waiting"}>
            <Icon name="bell" size={20} />{waiting > 0 && <span className="dot" aria-hidden="true" />}
          </Link>
          <ThemeToggle initial={theme} />
          <Link className="hello" href="/account" style={{ textDecoration: "none", color: "inherit" }} aria-label={`Your account: ${a.name}`}>
            <span className="hi">Hi {first}!</span>
            <span className="avatar-g" aria-hidden="true">{first[0]}</span>
          </Link>
        </div>
      </header>
      <Proximity radius={150} intensity={0.85} scale={0.55} enabled />
      <div className="adm-shell">
        <PortalRail nav={nav} logout={logout} />
        <main className="adm-page" id="main">
          <SiteSwitcher items={sw} className="switcher mob-switcher" />
          {!env.require2fa && a.role === "SUPER" && (
            <p className="note warn small" role="status">Two-factor sign-in is switched off (<span className="mono">PORTAL_REQUIRE_2FA=false</span>): admins sign in with a password only. Switch it back on before launch.</p>
          )}
          {children}
        </main>
      </div>
      <PortalBottomNav nav={nav} />
    </AppShell>
  );
}
