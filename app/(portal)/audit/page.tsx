import Link from "next/link";
import { and, auditLog, db, desc, eq, ilike, or } from "@/db";
import { requireSuper } from "@/core/auth";
import { SITES, type SiteKey } from "@/core/sites";
import { dateShort, time } from "@/ui/format";

export const metadata = { title: "Audit log" };

const SITE_FILTERS = ["all", "portal", "clothing", "wholesale", "events"] as const;
const OUTCOMES = ["all", "ok", "denied", "failed"] as const;

/* Every admin action: who did what, on which site, when, from where, and whether it worked.
   Super Admins only. Entries can't be edited or deleted from the portal. */
export default async function Audit({ searchParams }: { searchParams: Promise<{ site?: string; outcome?: string; q?: string }> }) {
  await requireSuper();
  const sp = await searchParams;
  const site = SITE_FILTERS.find((s) => s === sp.site) ?? "all";
  const outcome = OUTCOMES.find((s) => s === sp.outcome) ?? "all";
  const q = sp.q?.trim();
  const rows = await db.query.auditLog.findMany({
    where: and(
      site === "all" ? undefined : eq(auditLog.site, site),
      outcome === "all" ? undefined : eq(auditLog.outcome, outcome),
      q ? or(ilike(auditLog.adminEmail, `%${q}%`), ilike(auditLog.action, `%${q}%`), ilike(auditLog.target, `%${q}%`)) : undefined,
    ),
    orderBy: desc(auditLog.at), limit: 300,
  });
  const href = (p: Record<string, string>) => `/audit?${new URLSearchParams({ site, outcome, ...(q ? { q } : {}), ...p }).toString()}`;

  return (
    <>
      <div className="sec-head"><div><span className="who"><i aria-hidden="true" />Nepthic Admin Portal</span><h1 className="page" style={{ marginTop: 6 }}>Audit log</h1>
        <p className="dim small" style={{ marginTop: 6 }}>Sign-ins, account changes and every action sent to a site. Each site also keeps its own record of changes made through the portal.</p></div>
        <form className="row" role="search"><input type="hidden" name="site" value={site} /><input type="hidden" name="outcome" value={outcome} />
          <input type="search" name="q" defaultValue={q} placeholder="Admin, action or item" aria-label="Search the audit log" style={{ width: 240 }} /><button className="btn btn-sm">Search</button></form>
      </div>
      <nav className="pills" aria-label="Site">
        {SITE_FILTERS.map((s) => <Link key={s} className="pill-f" href={href({ site: s })} aria-current={site === s ? "page" : undefined} style={{ ["--c" as string]: s in SITES ? SITES[s as SiteKey].accent : "#8B5CF6" }}>{s !== "all" && <i />}{s === "all" ? "All" : s === "portal" ? "Portal" : SITES[s as SiteKey].short}</Link>)}
      </nav>
      <nav className="pills" aria-label="Outcome">
        {OUTCOMES.map((o) => <Link key={o} className="pill-f" href={href({ outcome: o })} aria-current={outcome === o ? "page" : undefined}>{o === "all" ? "Any outcome" : o === "ok" ? "Succeeded" : o === "denied" ? "Denied" : "Failed"}</Link>)}
      </nav>
      <section className="panel prox">
        <div className="scroll"><table className="tbl rtable audit-tbl">
          <thead><tr><th>When</th><th>Who</th><th>Site</th><th>Action</th><th>Item</th><th>Result</th><th>IP</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{dateShort(r.at)} {time(r.at)}</td>
                <td className="small" data-label="Who">{r.adminEmail}</td>
                <td data-label="Site" className="small">{r.site in SITES ? <><i className="site-dot" style={{ background: SITES[r.site as SiteKey].accent }} />{SITES[r.site as SiteKey].short}</> : "Portal"}</td>
                <td data-label="Action" className="mono small">{r.action}</td>
                <td data-label="Item" className="small dim" style={{ maxWidth: 260, overflowWrap: "anywhere" }}>{r.target ?? "—"}{r.detail ? <details><summary>details</summary><pre className="small" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(r.detail, null, 1)}</pre></details> : null}</td>
                <td data-label="Result" className={`small outcome-${r.outcome}`}><b>{r.outcome === "ok" ? "OK" : r.outcome}</b></td>
                <td data-label="IP" className="mono small dim">{r.ip ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="dim">Nothing matches.</td></tr>}
          </tbody>
        </table></div>
        <p className="small dim">Showing the newest 300 entries that match.</p>
      </section>
    </>
  );
}
