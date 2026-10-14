import { requireAdmin } from "@/core/auth";
import { ActionForm, Submit } from "@/ui/Forms";
import { changePassword } from "@/app/(portal)/account/actions";

export const metadata = { title: "Choose your password" };

/* First sign-in with a temporary password: choose your own before anything else opens. */
export default async function ChoosePassword() {
  const a = await requireAdmin({ allowDoor: true, allowPasswordChange: true });
  return (
    <section className="auth-card">
      <p className="eyebrow">{a.mustChangePassword ? "One more step" : "Your account"}</p>
      <h1 className="page" style={{ marginTop: 6 }}>Choose your own password</h1>
      <p className="dim small">You signed in with a temporary password. Pick a new one (12+ characters) that you don&apos;t use anywhere else.</p>
      <ActionForm action={changePassword} className="stack-sm">
        <label className="f">Temporary password<input type="password" name="current" autoComplete="current-password" required /></label>
        <label className="f">New password<input type="password" name="next" autoComplete="new-password" minLength={12} required /></label>
        <label className="f">New password again<input type="password" name="again" autoComplete="new-password" minLength={12} required /></label>
        <Submit pendingText="Saving…">Save password</Submit>
      </ActionForm>
    </section>
  );
}
