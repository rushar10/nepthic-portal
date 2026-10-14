import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { aud, dateShort } from "@/ui/format";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Buyers" };

type C = { id: string; name: string; email: string; createdAt: string; business: { tradingName: string; status: string } | null; orderCount: number; paidCents: number };
const status = (s?: string) => s === "APPROVED" ? <span className="pill ok">Approved</span> : s === "REJECTED" ? <span className="pill bad">Declined</span> : s === "PENDING" ? <span className="pill warn">Awaiting approval</span> : <span className="pill">No business</span>;

/* Wholesale's own buyer accounts (they don't exist on Clothing or Events). Read-only here. */
export default async function Buyers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const a = await requireSite("wholesale");
  const { q } = await searchParams;
  const r = await callSite<{ customers: C[] }>(a, "wholesale", "customers.list", { q });
  return (
    <>
      <SectionHead site="wholesale" title="Buyers" livePath="/account" sub={<>Wholesale logins. Approve or decline the businesses behind them on <a href="/wholesale/businesses">Business accounts</a>.</>}>
        <form className="row" role="search"><input type="search" name="q" defaultValue={q} placeholder="Name or email" aria-label="Search buyers" style={{ width: 220 }} /><button className="btn btn-sm">Search</button></form>
      </SectionHead>
      {!r.ok ? <SiteProblem site="wholesale" r={r} /> : (
        <section className="panel prox">
          <div className="scroll"><table className="tbl rtable">
            <thead><tr><th>Name</th><th>Email</th><th>Account</th><th>Joined</th><th className="num">Orders</th><th className="num">Paid</th></tr></thead>
            <tbody>
              {r.data.customers.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b>{u.business && <div className="small dim">{u.business.tradingName}</div>}</td>
                  <td className="small" data-label="Email">{u.email}</td>
                  <td data-label="Account">{status(u.business?.status)}</td>
                  <td data-label="Joined">{dateShort(u.createdAt)}</td>
                  <td className="num" data-label="Orders">{u.orderCount}</td>
                  <td className="num" data-label="Paid">{aud(u.paidCents)}</td>
                </tr>
              ))}
              {r.data.customers.length === 0 && <tr><td colSpan={6} className="dim">No buyers match.</td></tr>}
            </tbody>
          </table></div>
        </section>
      )}
    </>
  );
}
