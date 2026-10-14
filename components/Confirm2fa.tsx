/** The "enter your 2FA code to confirm" field on sensitive actions. Once confirmed, the next
    5 minutes of sensitive actions don't ask again. */
export function Confirm2fa({ note, confirmed }: { note: string; confirmed: boolean }) {
  if (confirmed) return <p className="small dim confirm-ok">Confirmed with your 2FA code in the last 5 minutes.</p>;
  return (
    <label className="f confirm-2fa">
      <span>2FA code <span className="dim">· {note}</span></span>
      <input type="text" name="confirmCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="6-digit code" />
    </label>
  );
}
