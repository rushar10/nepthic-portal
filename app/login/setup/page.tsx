import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { admins, db, eq } from "@/db";
import { ActionForm, Submit } from "@/ui/Forms";
import { pendingAdmin } from "@/core/auth";
import { decrypt, encrypt } from "@/core/crypto";
import { newSecret, otpauthUri } from "@/core/totp";
import { confirmSetup } from "../actions";

export const metadata = { title: "Set up two-factor" };
export const dynamic = "force-dynamic";

/* First sign-in on an account: 2FA is required, so it's set up before anything else opens. */
export default async function Setup() {
  const a = await pendingAdmin();
  if (!a) redirect("/login");
  if (a.totpConfirmedAt) redirect("/login/verify");
  let secret = a.totpSecret ? decrypt(a.totpSecret) : null;
  if (!secret) {
    secret = newSecret();
    await db.update(admins).set({ totpSecret: encrypt(secret) }).where(eq(admins.id, a.id));
  }
  const qr = await QRCode.toDataURL(otpauthUri(secret, a.email), { margin: 1, width: 392, errorCorrectionLevel: "M" });
  return (
    <section className="auth-card" aria-labelledby="t">
      <div className="brand"><span className="mark" aria-hidden="true">N</span>NEPTHIC</div>
      <div className="steps-mini" aria-hidden="true"><i className="on" /><i className="on" /></div>
      <div>
        <p className="eyebrow">Required for every admin account</p>
        <h1 id="t">Set up two-factor authentication</h1>
        <p className="small dim" style={{ marginTop: 6 }}>Scan this with an authenticator app (Google Authenticator, 1Password, Authy, Microsoft Authenticator), then enter the code it shows.</p>
      </div>
      <div className="qr"><img src={qr} alt="QR code for your authenticator app" /></div>
      <details><summary className="small">Can&apos;t scan? Enter this key instead</summary><p className="secret" style={{ marginTop: 8 }}>{secret.match(/.{1,4}/g)?.join(" ")}</p></details>
      <ActionForm action={confirmSetup} className="stack-sm">
        <label className="f">6-digit code from the app<input className="code-input" type="text" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required /></label>
        <Submit pendingText="Checking…">Turn on 2FA and sign in</Submit>
      </ActionForm>
    </section>
  );
}
