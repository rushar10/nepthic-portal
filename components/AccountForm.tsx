"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { toast } from "@/ui/ux/toast";
import type { AccountState } from "@/app/(portal)/admins/actions";

/** Form for account changes. Shows a new temporary password once, in place, so it can be
    copied and shared privately (it isn't stored anywhere in clear). */
export function AccountForm({ action, children, className = "stack-sm", confirmed }: {
  action: (s: AccountState, fd: FormData) => Promise<AccountState>; children: ReactNode; className?: string; confirmed: boolean;
}) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !state.password) toast({ message: state.ok, tone: "ok" });
    if (state?.ok) form.current?.querySelectorAll<HTMLInputElement>('input[name="confirmCode"]').forEach((i) => { i.value = ""; });
  }, [state]);
  return (
    <form ref={form} action={dispatch} className={className} aria-busy={pending}>
      {children}
      {confirmed
        ? <p className="small dim confirm-ok">Confirmed with your 2FA code in the last 5 minutes.</p>
        : <label className="f confirm-2fa"><span>2FA code <span className="dim">· required for account changes</span></span>
            <input type="text" name="confirmCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="6-digit code" /></label>}
      {state?.error && <p className="note bad" role="alert">{state.error}</p>}
      {state?.password && (
        <div className="note ok" role="status">
          <p>{state.ok}</p>
          <p className="small" style={{ marginTop: 6 }}>Temporary password for <b>{state.email}</b> (shown once):</p>
          <p className="temp-pw" style={{ marginTop: 6 }}>{state.password}</p>
        </div>
      )}
    </form>
  );
}
