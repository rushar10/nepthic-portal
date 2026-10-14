import Link from "next/link";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { aud, dateShort, time } from "@/ui/format";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Wholesale payments" };

const KINDS = ["ALL", "FULL", "DEPOSIT", "BALANCE", "REFUND"] as const;
const label = (k: string) => ({ ALL: "All", FULL: "Full", DEPOSIT: "Deposits", BALANCE: "Balances", REFUND: "Refunds" })[k] ?? k;
type Pay = { id: string; kind: string; amountCents: number; description: string; paidAt: string; stripeRefundId: string | null; stripePaymentIntentId: string | null; order: { number: number; business: { tradingName: string } | null } | null };

export default async function Payments({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const a = await requireSite("wholesale", "manage");
  const { kind } = await searchParams;
  const k = KINDS.find((x) => x === kind) ?? "ALL";
  const r = await callSite<{ payments: Pay[]; mode: string }>(a, "wholesale", "payments.list", { kind: k === "ALL" ? "" : k }, { level: "manage" });
  if (!r.ok) return <><SectionHead site="wholesale" title="Payments" livePath={null} /><SiteProblem site="wholesale" r={r} /></>;
  const list = r.data.payments;
  const net = list.reduce((n, p) => n + p.amountCents, 0);
  return (
    <>
      <SectionHead site="wholesale" title="Payments" livePath={null}><span className="dim small">Net shown: <b className="mono">{aud(net)}</b></span></SectionHead>
      <nav className="chips" aria-label="Payment type">
        {KINDS.map((x) => <Link key={x} className="tab" href={x === "ALL" ? "/wholesale/payments" : `/wholesale/payments?kind=${x}`} aria-current={k === x ? "page" : undefined}>{label(x)}</Link>)}
      </nav>
      <section className="panel prox">
        <div className="scroll"><table className="tbl rtable">
          <thead><tr><th>When</th><th>Type</th><th>Business</th><th>Description</th><th>Reference</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td className="small">{dateShort(p.paidAt)} {time(p.paidAt)}</td>
                <td data-label="Type"><span className={`pill ${p.kind === "REFUND" ? "bad" : p.kind === "DEPOSIT" ? "warn" : "ok"}`}>{label(p.kind)}</span></td>
                <td data-label="Business">{p.order?.business?.tradingName ?? "—"}{p.order && <div className="small dim">Order #{p.order.number}</div>}</td>
                <td data-label="For">{p.description}</td>
                <td className="mono small dim" data-label="Ref">{p.stripeRefundId ?? p.stripePaymentIntentId ?? "—"}</td>
                <td className="num" data-label="Amount" style={{ color: p.amountCents < 0 ? "var(--bad)" : undefined }}>{aud(p.amountCents)}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="dim">No payments yet.</td></tr>}
          </tbody>
        </table></div>
        <p className="small dim">{r.data.mode === "mock" ? "Payments are in mock mode on Wholesale: nothing is charged." : "Refunds appear here only after a site admin approves them. Payouts and fees are in your Stripe dashboard."}</p>
      </section>
    </>
  );
}
