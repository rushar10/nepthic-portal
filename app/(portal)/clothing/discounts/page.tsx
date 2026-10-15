import { notFound } from "next/navigation";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { aud, dateShort } from "@/ui/format";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { QuickOp } from "@/components/QuickOp";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { discountState, type CloDiscount } from "@/core/clothing";

export const metadata = { title: "Clothing discounts" };
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const value = (d: CloDiscount) => (d.kind === "PERCENT" ? `${d.value}% off` : `${aud(d.value)} off`);

/* Discount codes for the retail store. Site admins only (the store checks this too). */
export default async function Discounts() {
  const a = await requireSite("clothing");
  if (!can(a, "clothing", "manage")) notFound();
  const r = await callSite<{ discounts: CloDiscount[] }>(a, "clothing", "discounts.list", {}, { level: "manage" });
  const path = "/clothing/discounts";
  if (!r.ok) return <><SectionHead site="clothing" title="Discounts" livePath="/" /><SiteProblem site="clothing" r={r} /></>;

  return (
    <>
      <SectionHead site="clothing" title="Discounts" livePath="/" sub="Codes customers enter at checkout. Pausing a code stops it working straight away." />
      <div className="cards">
        {r.data.discounts.map((d) => {
          const [label, tone] = discountState(d);
          return (
            <OpForm key={d.id} op="clothing:discount.save" path={path} className="card prox" id={d.code}>
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="active" value={d.active ? "true" : "false"} />
              <div className="spread">
                <div className="row"><b className="mono">{d.code}</b><span>{value(d)}{d.minSpendCents ? ` over ${aud(d.minSpendCents)}` : ""}</span></div>
                <div className="row">
                  <span className={`pill ${tone}`}>{label}</span>
                  <span className="pill">Used {d.used}{d.usageLimit !== null ? ` / ${d.usageLimit}` : ""}</span>
                  {d.active
                    ? <QuickOp op="clothing:discount.active" fields={{ id: d.id, active: "false" }} done="Paused" path={path} className="btn btn-sm btn-ghost">Pause</QuickOp>
                    : <QuickOp op="clothing:discount.active" fields={{ id: d.id, active: "true" }} done="Switched on" path={path} className="btn btn-sm">Switch on</QuickOp>}
                </div>
              </div>
              <details className="small">
                <summary style={{ cursor: "pointer" }}>Edit{d.startsAt || d.endsAt ? ` · ${d.startsAt ? `from ${dateShort(d.startsAt)}` : ""}${d.endsAt ? ` until ${dateShort(d.endsAt)}` : ""}` : ""}</summary>
                <DiscountFields d={d} />
                <Submit className="btn btn-sm prox" pendingText="Saving…">Save</Submit>
              </details>
            </OpForm>
          );
        })}
        {r.data.discounts.length === 0 && <div className="empty">No discount codes yet.</div>}
      </div>
      <OpForm op="clothing:discount.save" path={path} className="panel prox">
        <h2 className="h3">New discount code</h2>
        <DiscountFields />
        <Submit pendingText="Creating…">Create code</Submit>
      </OpForm>
    </>
  );
}

function DiscountFields({ d }: { d?: CloDiscount }) {
  return (
    <div className="form-grid" style={{ marginTop: 10 }}>
      <label className="f">Code<input type="text" name="code" defaultValue={d?.code} required pattern="[A-Za-z0-9_ \-]{3,24}" style={{ textTransform: "uppercase" }} /></label>
      <label className="f">Type<select name="kind" defaultValue={d?.kind ?? "PERCENT"}><option value="PERCENT">Percentage off</option><option value="FIXED">Dollar amount off</option></select></label>
      <label className="f">Value (% or $)<input type="number" name="value" step="0.01" min="0.01" placeholder="10" defaultValue={d ? (d.kind === "PERCENT" ? d.value : (d.value / 100).toFixed(2)) : ""} required /></label>
      <label className="f">Minimum spend ($)<input type="number" name="minSpend" step="0.01" min="0" placeholder="None" defaultValue={d?.minSpendCents ? (d.minSpendCents / 100).toFixed(2) : ""} /></label>
      <label className="f">Starts<input type="date" name="startsAt" defaultValue={day(d?.startsAt ?? null)} /></label>
      <label className="f">Ends<input type="date" name="endsAt" defaultValue={day(d?.endsAt ?? null)} /></label>
      <label className="f">Usage limit<input type="number" name="usageLimit" min="1" placeholder="No limit" defaultValue={d?.usageLimit ?? ""} /></label>
    </div>
  );
}
