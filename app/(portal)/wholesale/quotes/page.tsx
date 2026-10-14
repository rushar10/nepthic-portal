import Link from "next/link";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { aud, dateShort, orderNo, quoteNo } from "@/ui/format";
import { Status } from "@/ui/Status";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Quotes & enquiries" };

type Q = {
  id: string; number: number; type: "QUOTE" | "ENQUIRY"; status: string; itemsText: string; estimatedUnits: number; neededBy: string | null; message: string | null;
  amountCents: number | null; paymentMode: "FULL" | "DEPOSIT" | null; reply: string | null; expiresAt: string | null; createdAt: string;
  business: { tradingName: string }; user: { name: string; email: string }; order: { id: string; number: number } | null;
};
type D = { settings: { paymentMode: "FULL" | "DEPOSIT"; depositPct: number; quoteValidDays: number }; openCount: number; quotes: Q[] };

export default async function Quotes({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const a = await requireSite("wholesale");
  const { show } = await searchParams;
  const r = await callSite<D>(a, "wholesale", "quotes.list", { show });
  if (!r.ok) return <><SectionHead site="wholesale" title="Quotes & enquiries" livePath="/quote" /><SiteProblem site="wholesale" r={r} /></>;
  const { settings: s, openCount, quotes: list } = r.data;
  const path = `/wholesale/quotes${show === "all" ? "?show=all" : ""}`;

  return (
    <>
      <SectionHead site="wholesale" title="Quotes & enquiries" livePath="/quote">
        <nav className="row">
          <Link className="tab" href="/wholesale/quotes" aria-current={show !== "all" ? "page" : undefined}>Waiting<span className="count">{openCount}</span></Link>
          <Link className="tab" href="/wholesale/quotes?show=all" aria-current={show === "all" ? "page" : undefined}>All</Link>
        </nav>
      </SectionHead>
      {list.length === 0 && <div className="empty">No requests waiting.</div>}
      <div className="cards">
        {list.map((q) => (
          <article key={q.id} id={q.id} className={`card prox${q.status === "REQUESTED" ? " attn" : ""}`}>
            <div className="spread">
              <div className="row"><b className="mono">{quoteNo(q.number)}</b><span>{q.business.tradingName}</span><span className="dim small">{q.type === "QUOTE" ? "Quote" : "Enquiry"} · {dateShort(q.createdAt)}</span></div>
              <Status value={q.status} label={q.status === "REQUESTED" ? "Waiting" : undefined} />
            </div>
            <p><b>{q.itemsText}</b>{q.estimatedUnits > 0 && <> · <span className="mono">{q.estimatedUnits}</span> units</>}{q.neededBy && <> · needed by {dateShort(q.neededBy)}</>}</p>
            {q.message && <p className="dim small">“{q.message}” — {q.user.name}, {q.user.email}</p>}
            {q.status === "REQUESTED" ? (
              <OpForm op="wholesale:quote.respond" path={path} className="stack-sm">
                <input type="hidden" name="quoteId" value={q.id} />
                <div className="form-grid">
                  {q.type === "QUOTE" && (
                    <>
                      <label className="f">Quote total inc GST ($)<input type="number" name="amount" step="0.01" min="0" placeholder="0.00" /></label>
                      <label className="f">Payment terms
                        <select name="paymentMode" defaultValue="">
                          <option value="">Default ({s.paymentMode === "DEPOSIT" ? `${s.depositPct}% deposit` : "full payment"})</option>
                          <option value="FULL">Full payment</option>
                          <option value="DEPOSIT">{s.depositPct}% deposit + balance</option>
                        </select>
                      </label>
                    </>
                  )}
                  <label className="f full">{q.type === "QUOTE" ? "Message to buyer" : "Reply"}<textarea name="reply" placeholder={q.type === "QUOTE" ? "What's included, lead time, freight." : "Your answer"} /></label>
                </div>
                <div className="row">
                  <Submit className="btn btn-primary btn-sm prox" name="decision" value="send" optimistic="Sent" pendingText="Sending…">{q.type === "QUOTE" ? `Send quote (valid ${s.quoteValidDays} days)` : "Send reply"}</Submit>
                  <Submit className="btn btn-bad btn-sm" name="decision" value="decline" optimistic="Declined" pendingText="Declining…">Decline</Submit>
                </div>
              </OpForm>
            ) : (
              <div className="small">
                {q.amountCents != null && <span><b className="mono">{aud(q.amountCents)}</b> · {q.paymentMode ? (q.paymentMode === "DEPOSIT" ? "deposit terms" : "full payment") : "default terms"} · </span>}
                {q.reply && <span className="dim">“{q.reply}”</span>}
                {q.order && <> · became <Link className="mono" href={`/wholesale/orders#${q.order.id}`}>{orderNo(q.order.number)}</Link></>}
                {q.expiresAt && q.status === "QUOTED" && <span className="dim"> · expires {dateShort(q.expiresAt)}</span>}
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
