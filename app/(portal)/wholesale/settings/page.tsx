import { recentlyConfirmed, requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Wholesale settings" };

type S = { paymentMode: "FULL" | "DEPOSIT"; depositPct: number; balanceDueDays: number; quoteValidDays: number; moqPerStyle: number; proximityRadius: number; proximityIntensity: number; proximityEnabled: boolean };

export default async function Settings() {
  const a = await requireSite("wholesale", "manage");
  const r = await callSite<{ settings: S; connections: Record<string, string> }>(a, "wholesale", "settings.get", {}, { level: "manage" });
  if (!r.ok) return <><SectionHead site="wholesale" title="Wholesale settings" livePath={null} /><SiteProblem site="wholesale" r={r} /></>;
  const { settings: s, connections: c } = r.data;
  return (
    <>
      <SectionHead site="wholesale" title="Wholesale settings" livePath={null} />
      <OpForm op="wholesale:settings.save" path="/wholesale/settings" className="stack" confirm="changing payment settings" confirmed={recentlyConfirmed(a)}>
        <section className="panel prox">
          <h2 className="h3">Deposit or full payment</h2>
          <p className="dim small">Sets the default for new orders and quotes. Individual businesses, quotes and unpaid orders can override it.</p>
          <div className="seg" role="radiogroup" aria-label="Default payment terms">
            <label><input type="radio" name="paymentMode" value="FULL" defaultChecked={s.paymentMode === "FULL"} /> Full payment</label>
            <label><input type="radio" name="paymentMode" value="DEPOSIT" defaultChecked={s.paymentMode === "DEPOSIT"} /> Deposit + balance</label>
          </div>
          <div className="form-grid">
            <label className="f">Deposit (%)<input type="number" name="depositPct" min={5} max={90} defaultValue={s.depositPct} /></label>
            <label className="f">Balance due (days after request)<input type="number" name="balanceDueDays" min={0} defaultValue={s.balanceDueDays} /></label>
            <label className="f">Quotes valid for (days)<input type="number" name="quoteValidDays" min={1} defaultValue={s.quoteValidDays} /></label>
          </div>
        </section>
        <section className="panel prox">
          <h2 className="h3">Minimum order</h2>
          <div className="form-grid"><label className="f">Minimum units per style (MOQ)<input type="number" name="moqPerStyle" min={1} max={1000} defaultValue={s.moqPerStyle} /></label></div>
          <p className="dim small">Quantity price breaks are on the <a href="/wholesale/pricing">Pricing</a> page.</p>
        </section>
        <section className="panel prox">
          <h2 className="h3">Proximity glow</h2>
          <p className="dim small">Cards and buttons on the Wholesale site light up as the cursor gets close. Off automatically for touch screens and reduced motion.</p>
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
        <p className="dim small">Wholesale has no staff logins of its own. Who can manage Wholesale, and at what level, is set in the portal under <b>Admins &amp; roles</b> (Super Admins only).</p>
      </section>
      <section className="panel prox">
        <h2 className="h3">Connections</h2>
        <dl className="kv">
          <div><dt>Payments</dt><dd>{c.payments}</dd></div>
          <div><dt>Email</dt><dd>{c.email}</dd></div>
          <div><dt>Team alerts</dt><dd>{c.alerts}</dd></div>
        </dl>
      </section>
    </>
  );
}
