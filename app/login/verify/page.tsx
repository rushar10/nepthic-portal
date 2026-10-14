import { redirect } from "next/navigation";
import { ActionForm, Submit } from "@/ui/Forms";
import { pendingAdmin } from "@/core/auth";
import { verifyCode } from "../actions";

export const metadata = { title: "Two-factor code" };
export const dynamic = "force-dynamic";

export default async function Verify() {
  const a = await pendingAdmin();
  if (!a) redirect("/login");
  if (!a.totpConfirmedAt) redirect("/login/setup");
  return (
    <section className="auth-card" aria-labelledby="t">
      <div className="brand"><span className="mark" aria-hidden="true">N</span>NEPTHIC</div>
      <div className="steps-mini" aria-hidden="true"><i className="on" /><i className="on" /></div>
      <div>
        <p className="eyebrow">Two-factor authentication</p>
        <h1 id="t">Enter your code</h1>
        <p className="small dim" style={{ marginTop: 6 }}>Open your authenticator app and enter the 6-digit code for Nepthic Admin ({a.email}).</p>
      </div>
      <ActionForm action={verifyCode} className="stack-sm">
        <label className="f">6-digit code<input className="code-input" type="text" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus /></label>
        <Submit pendingText="Checking…">Sign in</Submit>
      </ActionForm>
      <a className="small" href="/login">Use a different account</a>
    </section>
  );
}
