import Link from "next/link";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { Icon } from "@/ui/Icons";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { CLOTHING_SECTIONS } from "@/core/clothing";

export const metadata = { title: "Clothing" };


/* Clothing (nepthic.com) joins the portal the same way as Wholesale and Events: by adding the
   admin API described in docs/admin-api.md. Until then this section says it isn't connected. */
export default async function Clothing() {
  const a = await requireSite("clothing");
  const r = await callSite(a, "clothing", "summary");
  return (
    <>
      <SectionHead site="clothing" title="Clothing" livePath={null} sub="The original Nepthic store at nepthic.com." />
      {!r.ok && <SiteProblem site="clothing" r={r} />}
      <div className="cards-2">
        {CLOTHING_SECTIONS.map((s) => (
          <Link key={s.key} href={`/clothing/${s.key}`} className="dcard" data-glow style={{ textDecoration: "none", color: "inherit", ["--c" as string]: "var(--clo)" }}>
            <div className="stat-top"><span className="stat-label">{s.label}</span><span className="stat-ico"><Icon name={s.icon} size={20} /></span></div>
            <span className="small dim">{s.what}</span>
          </Link>
        ))}
      </div>
      <section className="panel prox">
        <h2 className="h3">Connecting Clothing</h2>
        <ol className="small" style={{ paddingLeft: "1.2em", display: "grid", gap: 6 }}>
          <li>In the Clothing site&apos;s code, add the admin API (<span className="mono">POST /api/ops/v1/&lt;operation&gt;</span>) that checks the portal&apos;s signed token. The contract is in <span className="mono">docs/admin-api.md</span>; Wholesale&apos;s <span className="mono">core/ops/</span> folder is a working example.</li>
          <li>Give the Clothing site <span className="mono">PORTAL_PUBLIC_KEY</span>, and remove any <span className="mono">/admin</span> pages it has.</li>
          <li>Set <span className="mono">CLOTHING_API_URL</span> on the portal. This section switches on by itself.</li>
        </ol>
      </section>
    </>
  );
}
