import { Icon } from "@/ui/Icons";
import { SITES, type SiteKey } from "@/core/sites";

/** Page heading for a site section: the site's dot and name, the title, and "View live site". */
export function SectionHead({ site, title, sub, livePath = "/", children }: { site: SiteKey; title: string; sub?: React.ReactNode; livePath?: string | null; children?: React.ReactNode }) {
  return (
    <div className="sec-head">
      <div>
        <span className="who"><i aria-hidden="true" />{SITES[site].name}</span>
        <h1 className="page" style={{ marginTop: 6 }}>{title}</h1>
        {sub && <p className="dim small" style={{ marginTop: 6, maxWidth: "75ch" }}>{sub}</p>}
      </div>
      <div className="row">
        {children}
        {livePath !== null && <LiveButton site={site} path={livePath} />}
      </div>
    </div>
  );
}

/** Opens the customer site in a new tab with the admin preview bar (only this admin sees it). */
export function LiveButton({ site, path = "/", label = "View live site" }: { site: SiteKey; path?: string; label?: string }) {
  return (
    <a className="live-btn" href={`/go/${site}?path=${encodeURIComponent(path)}`} target="_blank" rel="noopener" aria-label={`${label}: ${SITES[site].short} (opens in a new tab with the admin preview bar)`}>
      {label} <Icon name="external" size={16} />
    </a>
  );
}
