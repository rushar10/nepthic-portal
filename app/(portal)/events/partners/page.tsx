import { asc, and, eq } from "drizzle-orm";
import { admins, db } from "@/db";
import { recentlyConfirmed, requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { env } from "@/core/env";
import { aud } from "@/ui/format";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { QuickOp } from "@/components/QuickOp";
import { AccountForm } from "@/components/AccountForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { PARTNER_TABS, SubTabs } from "@/components/EventPicker";
import { accountAction, createAccount } from "@/app/(portal)/admins/actions";

export const metadata = { title: "Partners" };

type P = {
  id: string; name: string; code: string; kind: string; contactName: string; email: string; phone: string; color: string;
  commissionPct: number; paymentTerms: string; referralCode: string; status: "ACTIVE" | "SUSPENDED"; link: string;
  allocated: number; sold: number; scanned: number; revenueCents: number;
};
const KINDS = ["RESELLER", "VENUE", "PROMOTER", "SPONSOR", "OUTLET"];

/* Resellers, venues, promoters, sponsors and outlets that sell Nepthic tickets. */
export default async function Partners() {
  const a = await requireSite("events");
  const manage = can(a, "events", "manage");
  const r = await callSite<{ partners: P[] }>(a, "events", "partners.list");
  const logins = manage ? await db.query.admins.findMany({ where: and(eq(admins.role, "PARTNER")), orderBy: asc(admins.name), columns: { id: true, name: true, email: true, partnerCode: true, disabledAt: true, lastLoginAt: true } }) : [];
  const confirmed = recentlyConfirmed(a);
  const path = "/events/partners";
  const head = (
    <SectionHead site="events" title="Partners" livePath={null} sub="Each partner gets a code printed on their tickets, a sales link and an optional login that shows only their own tickets.">
      <SubTabs items={PARTNER_TABS} current={path} />
    </SectionHead>
  );
  if (!r.ok) return <>{head}<SiteProblem site="events" r={r} /></>;

  return (
    <>
      {head}
      <div className="cards">
        {r.data.partners.map((p) => {
          const link = `${env.sites.events.url}${p.link}`;
          const mine = logins.filter((l) => l.partnerCode === p.code);
          return (
            <article key={p.id} className="card prox" id={p.code} style={{ ["--c" as string]: p.color }}>
              <div className="spread">
                <div className="row"><span className="partner-badge" style={{ background: p.color }}>{p.code}</span><b>{p.name}</b><span className="dim small">{p.kind.toLowerCase()}</span></div>
                <div className="row">
                  {p.status === "SUSPENDED" ? <span className="pill bad">Suspended</span> : <span className="pill ok">Active</span>}
                  {manage && (p.status === "ACTIVE"
                    ? <QuickOp op="events:partner.status" fields={{ id: p.id, status: "SUSPENDED" }} done="Suspended" path={path} className="btn btn-sm btn-ghost">Suspend</QuickOp>
                    : <QuickOp op="events:partner.status" fields={{ id: p.id, status: "ACTIVE" }} done="Active again" path={path} className="btn btn-sm">Reactivate</QuickOp>)}
                </div>
              </div>
              <dl className="kv">
                <div><dt>Allocated</dt><dd className="mono">{p.allocated}</dd></div>
                <div><dt>Sold</dt><dd className="mono">{p.sold}</dd></div>
                <div><dt>Scanned in</dt><dd className="mono">{p.scanned}</dd></div>
                <div><dt>Revenue</dt><dd className="mono">{aud(p.revenueCents)}</dd></div>
                <div><dt>Commission</dt><dd>{p.commissionPct}%{p.commissionPct ? ` · ${aud(Math.round(p.revenueCents * p.commissionPct / 100))}` : ""}</dd></div>
                <div><dt>Terms</dt><dd className="small">{p.paymentTerms || "—"}</dd></div>
              </dl>
              <div className="small">Sales link <span className="mono copyable">{link}</span> · partner code at checkout <span className="mono">{p.referralCode}</span></div>
              <div className="small dim">{[p.contactName, p.email, p.phone].filter(Boolean).join(" · ") || "No contact details yet"}</div>
              {manage && (
                <details className="small">
                  <summary style={{ cursor: "pointer" }}>Edit details{mine.length ? ` · ${mine.length} login${mine.length > 1 ? "s" : ""}` : ""}</summary>
                  <OpForm op="events:partner.save" path={path} className="stack-sm">
                    <input type="hidden" name="id" value={p.id} />
                    <PartnerFields p={p} />
                    <Submit className="btn btn-sm prox" pendingText="Saving…">Save partner</Submit>
                  </OpForm>
                  <div className="stack-sm" style={{ marginTop: 14 }}>
                    <b>Partner logins</b>
                    {mine.length === 0 && <p className="dim">No login yet. A login shows only {p.name}&apos;s allocations, sales and scans.</p>}
                    {mine.map((l) => (
                      <AccountForm key={l.id} action={accountAction} confirmed={confirmed} twoFactor={env.require2fa} className="row">
                        <input type="hidden" name="_partner" value="1" /><input type="hidden" name="id" value={l.id} />
                        <span>{l.name} · {l.email}{l.disabledAt ? " · removed" : ""}</span>
                        <button className="btn btn-sm" name="do" value="reset-password">Reset password</button>
                        {l.disabledAt ? <button className="btn btn-sm" name="do" value="restore">Restore</button> : <button className="btn btn-sm btn-ghost" name="do" value="remove">Remove</button>}
                      </AccountForm>
                    ))}
                    <AccountForm action={createAccount} confirmed={confirmed} twoFactor={env.require2fa}>
                      <input type="hidden" name="_partner" value="1" /><input type="hidden" name="partnerCode" value={p.code} />
                      <div className="form-grid">
                        <label className="f">Name<input type="text" name="name" required /></label>
                        <label className="f">Email<input type="email" name="email" required /></label>
                      </div>
                      <button className="btn btn-sm" type="submit">Create partner login</button>
                    </AccountForm>
                  </div>
                </details>
              )}
            </article>
          );
        })}
        {r.data.partners.length === 0 && <div className="empty">No partners yet.</div>}
      </div>
      {manage && (
        <OpForm op="events:partner.save" path={path} className="panel prox">
          <h2 className="h3">Add a partner</h2>
          <PartnerFields />
          <Submit pendingText="Adding…">Add partner</Submit>
        </OpForm>
      )}
    </>
  );
}

function PartnerFields({ p }: { p?: P }) {
  return (
    <div className="form-grid">
      <label className="f">Name<input type="text" name="name" defaultValue={p?.name} required /></label>
      <label className="f">Partner code (printed on tickets)<input type="text" name="code" defaultValue={p?.code} required pattern="[A-Za-z0-9-]{2,10}" placeholder="P012" style={{ textTransform: "uppercase" }} /></label>
      <label className="f">Type<select name="kind" defaultValue={p?.kind ?? "RESELLER"}>{KINDS.map((k) => <option key={k} value={k}>{k[0] + k.slice(1).toLowerCase()}</option>)}</select></label>
      <label className="f">Badge colour<input type="color" name="color" defaultValue={p?.color ?? "#8B5CF6"} /></label>
      <label className="f">Commission (% of face value)<input type="number" name="commissionPct" step="0.5" min="0" max="50" defaultValue={p?.commissionPct ?? 10} /></label>
      <label className="f">Payment terms<input type="text" name="paymentTerms" defaultValue={p?.paymentTerms} placeholder="Monthly, 14 days" /></label>
      <label className="f">Contact name<input type="text" name="contactName" defaultValue={p?.contactName} /></label>
      <label className="f">Email<input type="email" name="email" defaultValue={p?.email} /></label>
      <label className="f">Phone<input type="tel" name="phone" defaultValue={p?.phone} /></label>
    </div>
  );
}
