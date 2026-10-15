"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { toast } from "@/ui/ux/toast";
import type { AccountState } from "@/app/(portal)/admins/actions";
import { ConfirmField } from "./ConfirmField";

/** Form for account changes. Shows a new temporary password once, in place, so it can be
    copied and shared privately (it isn't stored anywhere in clear). */
export function AccountForm({ action, children, className = "stack-sm", confirmed, twoFactor = true }: {
  action: (s: AccountState, fd: FormData) => Promise<AccountState>; children: ReactNode; className?: string; confirmed: boolean; twoFactor?: boolean;
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
      <ConfirmField note="required for account changes" confirmed={confirmed} twoFactor={twoFactor} />
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
