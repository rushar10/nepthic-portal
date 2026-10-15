import { Icon } from "@/ui/Icons";
import { SITES, type SiteKey } from "@/core/sites";
import type { OpResult } from "@/core/ops";

/** Shown in place of a screen when its site can't be reached (or isn't connected yet).
    Only that site is affected: the rest of the portal keeps working. */
export function SiteProblem({ site, r }: { site: SiteKey; r: Extract<OpResult<unknown>, { ok: false }> }) {
  const s = SITES[site];
  const title = r.kind === "not-connected" ? `${s.short} isn't connected yet` : r.kind === "forbidden" ? "Not available for your role" : r.kind === "unavailable" ? `${s.short} is unavailable` : `${s.short} couldn't load this`;
  return (
    <section className="dcard site-problem" style={{ ["--c" as string]: s.cssVar }} role="status">
      <div className="stat-top"><span className="stat-label">{title}</span><span className="stat-ico"><Icon name={r.kind === "unavailable" ? "wifi-off" : "info"} size={20} /></span></div>
      <p className="muted">{r.error}</p>
      {r.kind === "not-connected" && <p className="small dim">Install the admin API on the site ({site === "clothing" ? <span className="mono">clothing-kit/install.sh</span> : "see docs/admin-api.md"}), then set <span className="mono">{site.toUpperCase()}_API_URL</span> on the portal.</p>}
      {r.kind === "unavailable" && <p className="small dim">The other sites are unaffected and stay manageable. This screen tries again each time you open it.</p>}
    </section>
  );
}
