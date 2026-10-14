import { and, db, desc, eq, gte, sessions } from "@/db";
import { requireAdmin } from "@/core/auth";
import { env } from "@/core/env";
import { ROLE_LABEL } from "@/core/perms";
import { SITES, type SiteKey } from "@/core/sites";
import { dateShort, time } from "@/ui/format";
import { ActionForm, Submit } from "@/ui/Forms";
import { changePassword, signOutOthers } from "./actions";
import { logout } from "@/app/login/actions";

export const metadata = { title: "Your account" };

export default async function Account() {
  const a = await requireAdmin();
  const mine = await db.query.sessions.findMany({ where: and(eq(sessions.adminId, a.id), eq(sessions.stage, "active"), gte(sessions.expiresAt, new Date())), orderBy: desc(sessions.lastSeenAt) });
  return (
    <>
      <div className="sec-head"><div><span className="who"><i aria-hidden="true" />Nepthic Admin Portal</span><h1 className="page" style={{ marginTop: 6 }}>Your account</h1></div>
        <form action={logout}><button className="btn" type="submit">Sign out</button></form></div>
      <section className="panel prox">
        <dl className="kv">
          <div><dt>Name</dt><dd>{a.name}</dd></div>
          <div><dt>Email</dt><dd>{a.email}</dd></div>
          <div><dt>Role</dt><dd>{ROLE_LABEL[a.role]}</dd></div>
          <div><dt>Sites</dt><dd>{a.role === "SUPER" ? "All sites" : a.sites.map((s) => SITES[s as SiteKey]?.short ?? s).join(", ") || "None yet"}</dd></div>
          <div><dt>Two-factor</dt><dd>On (required)</dd></div>
          <div><dt>Session</dt><dd>Ends after {env.idleMinutes} minutes without activity</dd></div>
        </dl>
      </section>
      <section className="panel prox">
        <h2 className="h3">Change password</h2>
        <ActionForm action={changePassword} className="form-grid">
          <label className="f">Current password<input type="password" name="current" autoComplete="current-password" required /></label>
          <label className="f">New password (12+ characters)<input type="password" name="next" autoComplete="new-password" minLength={12} required /></label>
          <label className="f">New password again<input type="password" name="again" autoComplete="new-password" minLength={12} required /></label>
          <div style={{ alignSelf: "end" }}><Submit pendingText="Saving…">Change password</Submit></div>
        </ActionForm>
      </section>
      <section className="panel prox">
        <h2 className="h3">Where you&apos;re signed in</h2>
        <div className="scroll"><table className="tbl rtable">
          <thead><tr><th>Device</th><th>IP</th><th>Last active</th></tr></thead>
          <tbody>{mine.map((s) => <tr key={s.id}><td className="small">{(s.userAgent ?? "Unknown").slice(0, 90)}{s.id === a.sessionId && <b> · this device</b>}</td><td className="mono small" data-label="IP">{s.ip}</td><td className="small" data-label="Active">{dateShort(s.lastSeenAt)} {time(s.lastSeenAt)}</td></tr>)}</tbody>
        </table></div>
        {mine.length > 1 && <ActionForm action={signOutOthers}><Submit className="btn btn-sm">Sign out everywhere else</Submit></ActionForm>}
        <p className="small dim">Lost your phone or 2FA app? Ask a Super Admin to reset your 2FA.</p>
      </section>
    </>
  );
}
