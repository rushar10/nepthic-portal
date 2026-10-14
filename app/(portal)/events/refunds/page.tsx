import Link from "next/link";
import { recentlyConfirmed, requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { aud, dateLong, dateShort, daysUntil, refundNo } from "@/ui/format";
import { Status } from "@/ui/Status";
import { Submit } from "@/ui/Forms";
import { Swipeable } from "@/ui/Mobile";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Refund approvals" };

type R = { id: string; number: number; status: string; amountCents: number; reason: string; decisionNote: string | null; createdAt: string; user: { name: string; email: string }; ticket: { code: string; event: { name: string; startsAt: string }; ticketType: { name: string } } };

export default async function Refunds({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const a = await requireSite("events");
  const { show } = await searchParams;
  const r = await callSite<{ refunds: R[] }>(a, "events", "refunds.list", { show });
  if (!r.ok) return <><SectionHead site="events" title="Refund approvals" livePath="/tickets" /><SiteProblem site="events" r={r} /></>;
  const manage = can(a, "events", "manage");
  const confirmed = recentlyConfirmed(a);
  const path = `/events/refunds${show === "all" ? "?show=all" : ""}`;
  const list = r.data.refunds;
  return (
    <>
      <SectionHead site="events" title="Refund approvals" livePath="/tickets" sub="Approving refunds the ticket price to the buyer's card, cancels the ticket and puts the seat back on sale. Rejecting keeps the ticket valid.">
        <nav className="row">
          <Link className="tab" href="/events/refunds" aria-current={show !== "all" ? "page" : undefined}>Waiting</Link>
          <Link className="tab" href="/events/refunds?show=all" aria-current={show === "all" ? "page" : undefined}>All</Link>
        </nav>
      </SectionHead>
      {list.length === 0 && <div className="empty">No refund requests waiting.</div>}
      <div className="cards">
        {list.map((x) => (
          <Swipeable key={x.id} approveLabel={`Refund ${aud(x.amountCents)}`} rejectLabel="Reject refund">
            <article className={`card prox${x.status === "PENDING" ? " attn" : ""}`}>
              <div className="spread">
                <div className="row"><b className="mono">{refundNo(x.number)}</b><span>{x.user.name}</span><span className="dim small">{x.user.email} · {dateShort(x.createdAt)}</span></div>
                <Status value={x.status} />
              </div>
              <p>{x.ticket.event.name} · {x.ticket.ticketType.name} · <b className="mono">{aud(x.amountCents)}</b></p>
              <p className="small dim">Ticket <span className="mono">{x.ticket.code}</span> · reason: {x.reason} · event {dateLong(x.ticket.event.startsAt)} ({daysUntil(x.ticket.event.startsAt)} days away)</p>
              {x.status === "PENDING" ? (manage ? (
                <OpForm op="events:refund.decide" path={path} className="stack-sm" confirm="needed to approve a refund" confirmed={confirmed}>
                  <input type="hidden" name="refundId" value={x.id} />
                  <label className="f">Note to buyer (optional)<input type="text" name="note" /></label>
                  <div className="row">
                    <Submit className="btn btn-ok" name="decision" value="APPROVED" swipe="approve" optimistic="Refund approved" pendingText="Refunding…">Approve and refund {aud(x.amountCents)}</Submit>
                    <Submit className="btn btn-bad" name="decision" value="REJECTED" swipe="reject" optimistic="Rejected" pendingText="Saving…">Reject, keep ticket valid</Submit>
                  </div>
                </OpForm>
              ) : <p className="small dim">Waiting for a site admin to decide.</p>) : x.decisionNote && <p className="note small">{x.decisionNote}</p>}
            </article>
          </Swipeable>
        ))}
      </div>
    </>
  );
}
