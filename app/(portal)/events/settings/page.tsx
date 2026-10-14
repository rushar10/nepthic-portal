import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Events settings" };

type S = { ticketRefundCutoffHours: number; maxTicketsPerOrder: number; proximityRadius: number; proximityIntensity: number; proximityEnabled: boolean };

export default async function Settings() {
  const a = await requireSite("events", "manage");
  const r = await callSite<{ settings: S; connections: Record<string, string> }>(a, "events", "settings.get", {}, { level: "manage" });
  if (!r.ok) return <><SectionHead site="events" title="Events settings" livePath={null} /><SiteProblem site="events" r={r} /></>;
  const { settings: s, connections: c } = r.data;
  return (
    <>
      <SectionHead site="events" title="Events settings" livePath={null} />
      <OpForm op="events:settings.save" path="/events/settings" className="stack">
        <section className="panel prox">
          <h2 className="h3">Tickets and refunds</h2>
          <div className="form-grid">
            <label className="f">Refund requests close (hours before doors)<input type="number" name="ticketRefundCutoffHours" min={0} defaultValue={s.ticketRefundCutoffHours} /></label>
            <label className="f">Max tickets per order<input type="number" name="maxTicketsPerOrder" min={1} defaultValue={s.maxTicketsPerOrder} /></label>
          </div>
        </section>
        <section className="panel prox">
          <h2 className="h3">Proximity glow</h2>
          <div className="form-grid">
            <label className="f">Radius (px)<input type="number" name="proximityRadius" min={20} max={400} defaultValue={s.proximityRadius} /></label>
            <label className="f">Intensity (0–1)<input type="number" name="proximityIntensity" min={0} max={1} step={0.05} defaultValue={s.proximityIntensity} /></label>
          </div>
          <label className="row small"><input type="checkbox" name="proximityEnabled" defaultChecked={s.proximityEnabled} /> Effect on</label>
        </section>
        <Submit pendingText="Saving…">Save settings</Submit>
      </OpForm>
      <section className="panel prox">
        <h2 className="h3">Team access</h2>
        <p className="dim small">Events has no staff logins of its own. Door scanner accounts are on <a href="/events/door-staff">Scanner staff</a>; everyone else is managed by a Super Admin under <b>Admins &amp; roles</b>.</p>
      </section>
      <section className="panel prox">
        <h2 className="h3">Connections</h2>
        <dl className="kv"><div><dt>Payments</dt><dd>{c.payments}</dd></div><div><dt>Email</dt><dd>{c.email}</dd></div><div><dt>Team alerts</dt><dd>{c.alerts}</dd></div></dl>
      </section>
    </>
  );
}
