import { recentlyConfirmed, requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { dateShort } from "@/ui/format";
import { Status } from "@/ui/Status";
import { Submit } from "@/ui/Forms";
import { QuickOp } from "@/components/QuickOp";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Business accounts" };

type B = {
  id: string; tradingName: string; legalName: string; abn: string; phone: string; city: string; state: string; status: string;
  paymentModeOverride: "FULL" | "DEPOSIT" | null; createdAt: string; users: { name: string; email: string }[]; orderCount: number;
};
const abnFmt = (v: string) => v.replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4");

export default async function Businesses() {
  const a = await requireSite("wholesale");
  const r = await callSite<{ businesses: B[] }>(a, "wholesale", "businesses.list");
  if (!r.ok) return <><SectionHead site="wholesale" title="Business accounts" livePath="/register" /><SiteProblem site="wholesale" r={r} /></>;
  const list = r.data.businesses;
  const manage = can(a, "wholesale", "manage");
  const confirmed = recentlyConfirmed(a);
  const path = "/wholesale/businesses";
  const pending = list.filter((b) => b.status === "PENDING");
  const rest = list.filter((b) => b.status !== "PENDING");

  const row = (b: B) => (
    <tr key={b.id}>
      <td><b>{b.tradingName}</b><div className="small dim">{b.legalName}</div></td>
      <td className="mono" data-label="ABN">{abnFmt(b.abn)}</td>
      <td className="small" data-label="Contact">{b.users[0]?.name}<div className="dim">{b.users[0]?.email} · {b.phone}</div></td>
      <td className="small" data-label="Where">{b.city} {b.state}</td>
      <td data-label="Applied">{dateShort(b.createdAt)}</td>
      <td data-label="Status"><Status value={b.status} /></td>
      <td className="num" data-label="Orders">{b.orderCount}</td>
      <td>
        {manage ? (
          <div className="row" style={{ flexWrap: "nowrap" }}>
            {b.status !== "APPROVED" && <QuickOp op="wholesale:business.status" path={path} fields={{ businessId: b.id, status: "APPROVED" }} done={`${b.tradingName} approved`} className="btn btn-sm btn-ok">Approve</QuickOp>}
            {b.status === "PENDING" && <QuickOp op="wholesale:business.status" path={path} fields={{ businessId: b.id, status: "REJECTED" }} done="Application declined" className="btn btn-sm btn-bad">Reject</QuickOp>}
            {b.status === "APPROVED" && (
              <details><summary className="small" style={{ cursor: "pointer" }}>Payment terms{b.paymentModeOverride ? `: always ${b.paymentModeOverride.toLowerCase()}` : ""}</summary>
                <OpForm op="wholesale:business.terms" path={path} className="stack-sm" confirm="payment terms change" confirmed={confirmed}>
                  <input type="hidden" name="businessId" value={b.id} />
                  <select name="paymentMode" defaultValue={b.paymentModeOverride ?? ""} aria-label={`Payment terms for ${b.tradingName}`}>
                    <option value="">Default terms</option><option value="FULL">Always full</option><option value="DEPOSIT">Always deposit</option>
                  </select>
                  <Submit className="btn btn-sm">Save</Submit>
                </OpForm>
              </details>
            )}
          </div>
        ) : <span className="small dim">A site admin decides</span>}
      </td>
    </tr>
  );

  return (
    <>
      <SectionHead site="wholesale" title="Business accounts" livePath="/register"
        sub={<>Check the ABN on <a href="https://abr.business.gov.au" target="_blank" rel="noopener">ABN Lookup</a> before approving. Approved accounts see trade prices and can order.</>} />
      {([["Waiting for review", pending], ["All accounts", rest]] as const).map(([title, rows]) => rows.length > 0 && (
        <section key={title} className="panel prox">
          <h2 className="h3">{title}</h2>
          <div className="scroll"><table className="tbl rtable">
            <thead><tr><th>Business</th><th>ABN</th><th>Contact</th><th>Location</th><th>Applied</th><th>Status</th><th className="num">Orders</th><th /></tr></thead>
            <tbody>{rows.map(row)}</tbody>
          </table></div>
        </section>
      ))}
      {list.length === 0 && <div className="empty">No business accounts yet.</div>}
    </>
  );
}
