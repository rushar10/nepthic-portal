import { admins, asc, db } from "@/db";
import { recentlyConfirmed, requireSuper } from "@/core/auth";
import { ROLE_LABEL } from "@/core/perms";
import { SITES, SITE_KEYS, type SiteKey } from "@/core/sites";
import { dateShort, time } from "@/ui/format";
import { AccountForm } from "@/components/AccountForm";
import { accountAction, changeAccess, createAccount } from "./actions";

export const metadata = { title: "Admins & roles" };

const ROLE_HELP = [
  ["Super Admin", "Everything on all three sites. Adds and removes admins, sees the audit log."],
  ["Site Admin", "Everything on the site(s) they're assigned to: approvals, refunds, payments, pricing, settings."],
  ["Staff", "Day-to-day work on assigned sites: answer quotes, process orders, edit stock. No settings, payments, approvals or refunds."],
  ["Door / scanner staff", "Only the Events ticket scanner (admin.nepthic.com/scan). No portal screens."],
];

export default async function Admins() {
  const me = await requireSuper();
  const list = await db.query.admins.findMany({ orderBy: asc(admins.createdAt), columns: { passwordHash: false, totpSecret: false } });
  const confirmed = recentlyConfirmed(me);
  const now = new Date();

  return (
    <>
      <div className="sec-head"><div><span className="who"><i aria-hidden="true" />Nepthic Admin Portal</span><h1 className="page" style={{ marginTop: 6 }}>Admins &amp; roles</h1>
        <p className="dim small" style={{ marginTop: 6 }}>Portal accounts are separate from every customer account on the sites. There is no sign-up: accounts are created here, and everyone sets up 2FA at first sign-in.</p></div></div>

      <section className="panel prox">
        <h2 className="h3">Accounts</h2>
        <div className="scroll"><table className="tbl rtable">
          <thead><tr><th>Person</th><th>Role</th><th>Sites</th><th>2FA</th><th>Last sign-in</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.map((a) => {
              const locked = a.lockedUntil && a.lockedUntil > now;
              return (
                <tr key={a.id}>
                  <td><b>{a.name}</b>{a.id === me.id && <span className="small dim"> (you)</span>}<div className="small dim">{a.email}</div></td>
                  <td data-label="Role"><span className={`role-pill ${a.role}`}>{ROLE_LABEL[a.role]}</span></td>
                  <td data-label="Sites" className="small">{a.role === "SUPER" ? "All sites" : a.sites.map((s) => <span key={s} style={{ marginRight: 8, whiteSpace: "nowrap" }}><i className="site-dot" style={{ background: SITES[s as SiteKey]?.accent }} />{SITES[s as SiteKey]?.short ?? s}</span>)}</td>
                  <td data-label="2FA">{a.totpConfirmedAt ? <span className="pill ok">On</span> : <span className="pill warn">Set up at next sign-in</span>}</td>
                  <td data-label="Last sign-in" className="small">{a.lastLoginAt ? `${dateShort(a.lastLoginAt)} ${time(a.lastLoginAt)}` : "Never"}</td>
                  <td data-label="Status">{a.disabledAt ? <span className="pill bad">Removed</span> : locked ? <span className="pill warn">Locked</span> : a.mustChangePassword ? <span className="pill info">Temporary password</span> : <span className="pill ok">Active</span>}</td>
                  <td>
                    {a.id !== me.id && (
                      <details><summary className="small" style={{ cursor: "pointer" }}>Manage</summary>
                        <div className="stack-sm" style={{ marginTop: 10, minWidth: 260 }}>
                          <AccountForm action={changeAccess} confirmed={confirmed}>
                            <input type="hidden" name="id" value={a.id} />
                            <label className="f">Role<select name="role" defaultValue={a.role}>{(["SUPER", "SITE_ADMIN", "STAFF", "DOOR"] as const).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
                            <fieldset className="row small" style={{ border: 0, padding: 0 }}><legend className="small dim">Sites (Site Admin and Staff)</legend>
                              {SITE_KEYS.map((s) => <label key={s} className="row small"><input type="checkbox" name="sites" value={s} defaultChecked={a.sites.includes(s)} /> {SITES[s].short}</label>)}
                            </fieldset>
                            <button className="btn btn-sm" type="submit">Save access</button>
                          </AccountForm>
                          <AccountForm action={accountAction} confirmed={confirmed}>
                            <input type="hidden" name="id" value={a.id} />
                            <div className="row">
                              <button className="btn btn-sm" name="do" value="reset-password">Reset password</button>
                              <button className="btn btn-sm" name="do" value="reset-2fa">Reset 2FA</button>
                              {locked && <button className="btn btn-sm" name="do" value="unlock">Unlock</button>}
                              {a.disabledAt ? <button className="btn btn-sm btn-ok" name="do" value="restore">Restore access</button> : <button className="btn btn-sm btn-bad" name="do" value="remove">Remove access</button>}
                            </div>
                          </AccountForm>
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </section>

      <section className="panel prox">
        <h2 className="h3">Add an admin</h2>
        <AccountForm action={createAccount} confirmed={confirmed}>
          <div className="form-grid">
            <label className="f">Name<input type="text" name="name" required autoComplete="off" /></label>
            <label className="f">Work email<input type="email" name="email" required autoComplete="off" /></label>
            <label className="f">Role<select name="role" defaultValue="STAFF">{(["SITE_ADMIN", "STAFF", "DOOR", "SUPER"] as const).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
          </div>
          <fieldset className="row" style={{ border: 0, padding: 0 }}><legend className="small dim">Sites they manage (ignored for Super Admin; Door staff are Events only)</legend>
            {SITE_KEYS.map((s) => <label key={s} className="row small"><input type="checkbox" name="sites" value={s} /> <i className="site-dot" style={{ background: SITES[s].accent }} />{SITES[s].short}</label>)}
          </fieldset>
          <button className="btn btn-primary" type="submit">Create account</button>
        </AccountForm>
      </section>

      <section className="panel prox">
        <h2 className="h3">What each role can do</h2>
        <div className="scroll"><table className="tbl"><tbody>{ROLE_HELP.map(([r, d]) => <tr key={r}><td><b>{r}</b></td><td className="small">{d}</td></tr>)}</tbody></table></div>
        <p className="small dim">The site switcher only shows the sites someone may manage, and every request is checked again by the portal and by the site itself.</p>
      </section>
    </>
  );
}
