import Link from "next/link";
import { recentlyConfirmed, requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { aud, dateShort, orderNo, returnNo } from "@/ui/format";
import { Status } from "@/ui/Status";
import { Submit } from "@/ui/Forms";
import { Swipeable } from "@/ui/Mobile";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Return approvals" };

type R = {
  id: string; number: number; status: string; reason: string; units: number; details: string; photoIds: string[]; decisionNote: string | null; createdAt: string;
  user: { name: string; email: string }; order: { number: number; paidCents: number; refundedCents: number; business: { tradingName: string } | null };
};

export default async function Returns({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const a = await requireSite("wholesale");
  const { show } = await searchParams;
  const r = await callSite<{ returns: R[] }>(a, "wholesale", "returns.list", { show });
  if (!r.ok) return <><SectionHead site="wholesale" title="Return approvals" livePath="/account?tab=returns" /><SiteProblem site="wholesale" r={r} /></>;
  const list = r.data.returns;
  const manage = can(a, "wholesale", "manage");
  const confirmed = recentlyConfirmed(a);
  const path = `/wholesale/returns${show === "all" ? "?show=all" : ""}`;

  return (
    <>
      <SectionHead site="wholesale" title="Return approvals" livePath="/account?tab=returns" sub="Nothing is returned or refunded until a site admin approves it here. Approve first, then close the return once the goods are back.">
        <nav className="row">
          <Link className="tab" href="/wholesale/returns" aria-current={show !== "all" ? "page" : undefined}>Open</Link>
          <Link className="tab" href="/wholesale/returns?show=all" aria-current={show === "all" ? "page" : undefined}>All</Link>
        </nav>
      </SectionHead>
      {list.length === 0 && <div className="empty">No open returns.</div>}
      <div className="cards">
        {list.map((x) => (
          <Swipeable key={x.id} approveLabel="Approve return" rejectLabel="Reject return">
            <article className={`card prox${x.status === "PENDING" ? " attn" : ""}`}>
              <div className="spread">
                <div className="row"><b className="mono">{returnNo(x.number)}</b><span>{x.order.business?.tradingName}</span><span className="dim small">order {orderNo(x.order.number)} · {dateShort(x.createdAt)}</span></div>
                <Status value={x.status} />
              </div>
              <p><b>{x.reason}</b> · {x.units} units · order paid {aud(x.order.paidCents)}</p>
              <p className="dim small">{x.details}</p>
              {x.photoIds.length > 0 ? (
                <div className="thumbs">{x.photoIds.map((id, i) => <a key={id} href={`/files/wholesale/${id}`} target="_blank" rel="noopener"><img src={`/files/wholesale/${id}`} alt={`Return photo ${i + 1}`} /></a>)}</div>
              ) : <p className="small dim">No photos attached.</p>}

              {x.status === "PENDING" && (manage ? (
                <OpForm op="wholesale:return.decide" path={path} className="stack-sm">
                  <input type="hidden" name="returnId" value={x.id} />
                  <label className="f">Note to buyer<input type="text" name="note" placeholder="Optional. A standard note is sent if left blank." /></label>
                  <div className="row">
                    <Submit className="btn btn-ok" name="decision" value="APPROVED" swipe="approve" optimistic="Approved" pendingText="Saving…">Approve return</Submit>
                    <Submit className="btn btn-bad" name="decision" value="REJECTED" swipe="reject" optimistic="Rejected" pendingText="Saving…">Reject</Submit>
                  </div>
                </OpForm>
              ) : <p className="small dim">Waiting for a site admin to decide.</p>)}

              {x.status === "APPROVED" && manage && (
                <OpForm op="wholesale:return.complete" path={path} className="stack-sm" confirm="needed only if you refund money" confirmed={confirmed}>
                  <input type="hidden" name="returnId" value={x.id} />
                  <label className="f" style={{ maxWidth: 220 }}>Refund ($, optional)<input type="number" name="refund" step="0.01" min="0" placeholder="0.00" /></label>
                  <Submit className="btn btn-sm prox" optimistic="Closed" pendingText="Closing…">Goods received · close return</Submit>
                </OpForm>
              )}
              {x.decisionNote && x.status !== "PENDING" && <p className="note small">{x.decisionNote}</p>}
            </article>
          </Swipeable>
        ))}
      </div>
    </>
  );
}
