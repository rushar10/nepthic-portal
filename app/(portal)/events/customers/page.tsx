import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { aud, dateShort } from "@/ui/format";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Event customers" };

type C = { id: string; name: string; email: string; createdAt: string; orderCount: number; spendCents: number };

/* Ticket buyers with an Events account (Events' own accounts). Attendee lists per event are on each event. */
export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const a = await requireSite("events");
  const { q } = await searchParams;
  const r = await callSite<{ customers: C[] }>(a, "events", "customers.list", { q });
  return (
    <>
      <SectionHead site="events" title="Customers" livePath="/tickets" sub="Ticket buyers with an Events account. Each event's attendee list is on its event page.">
        <form className="row" role="search"><input type="search" name="q" defaultValue={q} placeholder="Name or email" aria-label="Search customers" style={{ width: 220 }} /><button className="btn btn-sm">Search</button></form>
      </SectionHead>
      {!r.ok ? <SiteProblem site="events" r={r} /> : (
        <section className="panel prox">
          <div className="scroll"><table className="tbl rtable">
            <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th className="num">Ticket orders</th><th className="num">Event spend</th></tr></thead>
            <tbody>
              {r.data.customers.map((u) => (
                <tr key={u.id}><td><b>{u.name}</b></td><td className="small" data-label="Email">{u.email}</td><td data-label="Joined">{dateShort(u.createdAt)}</td>
                  <td className="num" data-label="Orders">{u.orderCount}</td><td className="num" data-label="Spend">{aud(u.spendCents)}</td></tr>
              ))}
              {r.data.customers.length === 0 && <tr><td colSpan={5} className="dim">No customers match.</td></tr>}
            </tbody>
          </table></div>
        </section>
      )}
    </>
  );
}
