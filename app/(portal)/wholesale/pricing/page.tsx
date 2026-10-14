import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { aud } from "@/ui/format";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Pricing tiers" };

type T = { id: string; minUnits: number; maxUnits: number | null; discountPct: number };
/** Trade price: RRP less the tier discount (same rule as the Wholesale site's pricing). */
const tradeUnit = (rrp: number, pct: number) => Math.round((rrp * (100 - pct)) / 100);

export default async function Pricing() {
  const a = await requireSite("wholesale");
  const r = await callSite<{ tiers: T[]; moq: number }>(a, "wholesale", "pricing.get");
  if (!r.ok) return <><SectionHead site="wholesale" title="Volume pricing" livePath="/catalogue" /><SiteProblem site="wholesale" r={r} /></>;
  const manage = can(a, "wholesale", "manage");
  const rows: T[] = [...r.data.tiers, { id: "new", minUnits: 0, maxUnits: null, discountPct: 0 }];
  return (
    <>
      <SectionHead site="wholesale" title="Volume pricing" livePath="/catalogue" sub="The tier is set by total units in an order, across all styles. Trade price = RRP less the tier discount, ex GST. Sent quotes keep their own price." />
      <OpForm op="wholesale:pricing.save" path="/wholesale/pricing" className="panel prox">
        <div className="scroll"><table className="tbl">
          <thead><tr><th>Tier</th><th>From units</th><th>To units</th><th>Discount off RRP</th><th>e.g. $129 hoodie</th></tr></thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={t.id}>
                <td>{t.id === "new" ? <span className="dim">Add</span> : i + 1}</td>
                <td><input type="number" name={`rows[${i}][min]`} min={0} defaultValue={t.minUnits || ""} disabled={!manage} aria-label={`Tier ${i + 1} from`} /></td>
                <td><input type="number" name={`rows[${i}][max]`} min={0} defaultValue={t.maxUnits ?? ""} placeholder="and up" disabled={!manage} aria-label={`Tier ${i + 1} to`} /></td>
                <td><input type="number" name={`rows[${i}][off]`} min={0} max={90} defaultValue={t.discountPct || ""} disabled={!manage} aria-label={`Tier ${i + 1} discount`} /> %</td>
                <td className="mono">{t.id === "new" ? "" : aud(tradeUnit(12900, t.discountPct))}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <label className="f" style={{ maxWidth: 240 }}>Minimum units per style<input type="number" name="moq" min={1} defaultValue={r.data.moq} disabled={!manage} /></label>
        <p className="dim small">Clear a row&apos;s numbers to remove it. Leave &ldquo;to&rdquo; empty on the last tier.</p>
        {manage ? <Submit pendingText="Saving…">Save pricing</Submit> : <p className="small dim">Only site admins can change pricing.</p>}
      </OpForm>
    </>
  );
}
