import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { aud, dateShort } from "@/ui/format";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import type { CloCustomer } from "@/core/clothing";

export const metadata = { title: "Clothing customers" };

/* The retail store's own customer accounts (separate from Wholesale buyers and Events
   customers). Read-only: customers manage their own details in the store. */
export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const a = await requireSite("clothing");
  const { q } = await searchParams;
  const r = await callSite<{ customers: CloCustomer[] }>(a, "clothing", "customers.list", { q });
  return (
    <>
      <SectionHead site="clothing" title="Customers" livePath="/" sub="Shop accounts and what they've spent (after refunds). Customers change their own details in the store.">
        <form className="row" role="search"><input type="search" name="q" defaultValue={q} placeholder="Name or email" aria-label="Search customers" style={{ width: 220 }} /><button className="btn btn-sm">Search</button></form>
      </SectionHead>
      {!r.ok ? <SiteProblem site="clothing" r={r} /> : (
        <section className="panel prox">
          <div className="scroll"><table className="tbl rtable">
            <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Last order</th><th className="num">Orders</th><th className="num">Spent</th><th>Emails</th></tr></thead>
            <tbody>
              {r.data.customers.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td className="small" data-label="Email"><a href={`/clothing/orders?show=all&q=${encodeURIComponent(c.email)}`}>{c.email}</a></td>
                  <td data-label="Joined">{dateShort(c.createdAt)}</td>
                  <td data-label="Last order">{c.lastOrderAt ? dateShort(c.lastOrderAt) : "—"}</td>
                  <td className="num" data-label="Orders">{c.orders}</td>
                  <td className="num" data-label="Spent">{aud(c.spentCents)}</td>
                  <td data-label="Emails">{c.marketing ? <span className="pill ok">Subscribed</span> : <span className="pill">No</span>}</td>
                </tr>
              ))}
              {r.data.customers.length === 0 && <tr><td colSpan={7} className="dim">No customers match.</td></tr>}
            </tbody>
          </table></div>
        </section>
      )}
    </>
  );
}
