/** Sensitive-action confirmation field: a 2FA code, or the password while 2FA is switched off. Safe in client components. */
export function ConfirmField({ note, confirmed, twoFactor }: { note: string; confirmed: boolean; twoFactor: boolean }) {
  if (confirmed) return <p className="small dim confirm-ok">Confirmed in the last 5 minutes.</p>;
  return twoFactor ? (
    <label className="f confirm-2fa">
      <span>2FA code <span className="dim">· {note}</span></span>
      <input type="text" name="confirmCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="6-digit code" />
    </label>
  ) : (
    <label className="f confirm-2fa">
      <span>Your password <span className="dim">· {note}</span></span>
      <input type="password" name="confirmCode" autoComplete="current-password" placeholder="Portal password" />
    </label>
  );
}
