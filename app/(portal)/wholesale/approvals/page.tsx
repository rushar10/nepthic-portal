import Link from "next/link";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { Icon } from "@/ui/Icons";
import { dateShort, quoteNo, returnNo } from "@/ui/format";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Wholesale approvals" };

type D = {
  counts: { quotes: number; returns: number; businesses: number; total: number };
  quotes: { id: string; number: number; business: string; itemsText: string; createdAt: string }[];
  returns: { id: string; number: number; business: string | null; reason: string; units: number; createdAt: string }[];
  businesses: { id: string; tradingName: string; abn: string; city: string; state: string; createdAt: string }[];
};

/* Everything on Wholesale waiting on a decision, oldest first. */
export default async function Approvals() {
  const a = await requireSite("wholesale");
  const r = await callSite<D>(a, "wholesale", "approvals.list");
  if (!r.ok) return <><SectionHead site="wholesale" title="Approvals" livePath={null} /><SiteProblem site="wholesale" r={r} /></>;
  const { counts: p, quotes: q, returns: ret, businesses: biz } = r.data;
  const queues = [
    { key: "quotes", label: "Quote requests", n: p.quotes, href: "/wholesale/quotes", icon: "quote" },
    { key: "returns", label: "Returns", n: p.returns, href: "/wholesale/returns", icon: "undo" },
    { key: "accounts", label: "Trade accounts", n: p.businesses, href: "/wholesale/businesses", icon: "user" },
  ];
  const rows = [
    ...q.map((x) => ({ id: x.id, icon: "quote", title: `${quoteNo(x.number)} · ${x.business}`, detail: x.itemsText, when: x.createdAt, href: `/wholesale/quotes#${x.id}`, action: "Respond" })),
    ...ret.map((x) => ({ id: x.id, icon: "undo", title: `${returnNo(x.number)} · ${x.business ?? "Customer"}`, detail: `${x.reason} · ${x.units} units`, when: x.createdAt, href: "/wholesale/returns", action: "Review" })),
    ...biz.map((x) => ({ id: x.id, icon: "user", title: x.tradingName, detail: `New trade account · ABN ${x.abn} · ${x.city} ${x.state}`, when: x.createdAt, href: "/wholesale/businesses", action: "Review" })),
  ].sort((x, y) => new Date(x.when).getTime() - new Date(y.when).getTime());

  return (
    <>
      <SectionHead site="wholesale" title="Approvals" sub={p.total ? `${p.total} waiting on the team` : "Nothing waiting"} livePath={null} />
      <div className="dash-stack" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", display: "grid" }}>
        {queues.map((x) => (
          <Link key={x.key} href={x.href} className="dcard" data-glow style={{ textDecoration: "none", color: "inherit", ["--c" as string]: "var(--ws)" }}>
            <div className="stat-top"><span className="stat-label">{x.label}</span><span className="stat-ico"><Icon name={x.icon} size={20} /></span></div>
            <span className="big">{x.n}</span>
          </Link>
        ))}
      </div>
      <section className="dcard" data-glow>
        <div className="dcard-head"><h2>Oldest first</h2></div>
        {rows.length === 0 ? <p className="muted">Nothing needs a decision right now.</p> : (
          <ul className="act">
            {rows.map((x) => (
              <li key={x.id} style={{ ["--c" as string]: "var(--ws)" }}>
                <span className="act-ico"><Icon name={x.icon} size={20} /></span>
                <span style={{ minWidth: 0 }}><span className="act-name" style={{ display: "block" }}>{x.title}</span><span className="act-type" style={{ display: "block" }}>{x.detail} · {dateShort(x.when)}</span></span>
                <Link className="btn-pill" style={{ height: 40, padding: "0 16px" }} href={x.href}>{x.action}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
