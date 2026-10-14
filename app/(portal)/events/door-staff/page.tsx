import { admins, and, asc, db, eq } from "@/db";
import { recentlyConfirmed, requireSite } from "@/core/auth";
import { dateShort, time } from "@/ui/format";
import { AccountForm } from "@/components/AccountForm";
import { SectionHead } from "@/components/Section";
import { accountAction, createAccount } from "../../admins/actions";

export const metadata = { title: "Scanner staff" };

/* Door / scanner staff for Events: they can sign in only to the ticket scanner. */
export default async function DoorStaff() {
  const a = await requireSite("events", "manage");
  const list = await db.query.admins.findMany({ where: and(eq(admins.role, "DOOR")), orderBy: asc(admins.name), columns: { passwordHash: false, totpSecret: false } });
  const confirmed = recentlyConfirmed(a);
  return (
    <>
      <SectionHead site="events" title="Scanner staff" livePath={null} sub="Door teams sign in at admin.nepthic.com/scan with their own email, password and 2FA. They see only the scanner: no portal screens, no customer lists." />
      <section className="panel prox">
        <div className="scroll"><table className="tbl rtable">
          <thead><tr><th>Name</th><th>2FA</th><th>Last sign-in</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id}>
                <td><b>{d.name}</b><div className="small dim">{d.email}</div></td>
                <td data-label="2FA">{d.totpConfirmedAt ? <span className="pill ok">On</span> : <span className="pill warn">At first sign-in</span>}</td>
                <td data-label="Last sign-in" className="small">{d.lastLoginAt ? `${dateShort(d.lastLoginAt)} ${time(d.lastLoginAt)}` : "Never"}</td>
                <td data-label="Status">{d.disabledAt ? <span className="pill bad">Removed</span> : <span className="pill ok">Active</span>}</td>
                <td>
                  <details><summary className="small" style={{ cursor: "pointer" }}>Manage</summary>
                    <AccountForm action={accountAction} confirmed={confirmed}>
                      <input type="hidden" name="_door" value="1" /><input type="hidden" name="id" value={d.id} />
                      <div className="row">
                        <button className="btn btn-sm" name="do" value="reset-password">Reset password</button>
                        <button className="btn btn-sm" name="do" value="reset-2fa">Reset 2FA</button>
                        {d.disabledAt ? <button className="btn btn-sm btn-ok" name="do" value="restore">Restore</button> : <button className="btn btn-sm btn-bad" name="do" value="remove">Remove access</button>}
                      </div>
                    </AccountForm>
                  </details>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="dim">No scanner staff yet.</td></tr>}
          </tbody>
        </table></div>
      </section>
      <section className="panel prox">
        <h2 className="h3">Add scanner staff</h2>
        <AccountForm action={createAccount} confirmed={confirmed}>
          <input type="hidden" name="_door" value="1" />
          <div className="form-grid">
            <label className="f">Name<input type="text" name="name" required autoComplete="off" /></label>
            <label className="f">Email<input type="email" name="email" required autoComplete="off" /></label>
          </div>
          <button className="btn btn-primary" type="submit">Create scanner account</button>
        </AccountForm>
      </section>
    </>
  );
}
