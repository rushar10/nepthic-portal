import type { ReactNode } from "react";
import { ActionForm } from "@/ui/Forms";
import { runAction } from "@/app/actions";
import { Confirm2fa } from "./Confirm2fa";

/** A form that runs one site action through the portal (role check, 2FA if sensitive, audit).
    `confirm`: show the 2FA field ("always" for always-sensitive actions, a hint for conditional ones). */
export function OpForm({ op, path, redirectTo, className, children, confirm, confirmed, optimistic, id }: {
  op: string; path?: string; redirectTo?: string; className?: string; children: ReactNode;
  confirm?: string; confirmed?: boolean; optimistic?: string; id?: string;
}) {
  return (
    <ActionForm action={runAction} className={className} optimistic={optimistic} id={id}>
      <input type="hidden" name="_a" value={op} />
      {path && <input type="hidden" name="_path" value={path} />}
      {redirectTo && <input type="hidden" name="_redirect" value={redirectTo} />}
      {children}
      {confirm && <Confirm2fa note={confirm} confirmed={!!confirmed} />}
    </ActionForm>
  );
}
