import { redirect } from "next/navigation";
import { ActionForm, Submit } from "@/ui/Forms";
import { getAdmin } from "@/core/auth";
import { signIn } from "./actions";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

/* Admin-only sign-in. There is no sign-up: accounts are created by a Super Admin. Customer
   accounts from the shop, Wholesale or Events don't exist here and can't sign in. */
export default async function Login({ searchParams }: { searchParams: Promise<{ expired?: string; timeout?: string }> }) {
  if (await getAdmin()) redirect("/");
  const sp = await searchParams;
  return (
    <section className="auth-card" aria-labelledby="t">
      <div className="brand"><span className="mark" aria-hidden="true">N</span>NEPTHIC</div>
      <div className="steps-mini" aria-hidden="true"><i className="on" /><i /></div>
      <div>
        <p className="eyebrow">Admin portal</p>
        <h1 id="t">Sign in</h1>
        <p className="small dim" style={{ marginTop: 6 }}>For Nepthic staff. You&apos;ll be asked for a code from your authenticator app next.</p>
      </div>
      {sp.expired && <p className="note warn">That sign-in took too long. Start again.</p>}
      <ActionForm action={signIn} className="stack-sm">
        <label className="f">Email<input type="email" name="email" autoComplete="username" required autoFocus /></label>
        <label className="f">Password<input type="password" name="password" autoComplete="current-password" required /></label>
        <Submit pendingText="Checking…">Continue</Submit>
      </ActionForm>
      <p className="small dim">Locked out or lost your phone? Ask a Super Admin to reset your access.</p>
    </section>
  );
}
