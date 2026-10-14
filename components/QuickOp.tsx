"use client";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "@/ui/ux/toast";
import { haptic } from "@/ui/ux/haptics";
import { runAction } from "@/app/actions";

/* One-tap site action (Approve, Reject…): shows the result straight away and runs the action
   in the background. If the site says no, the button comes back and a toast says why. */
export function QuickOp({ op, fields, children, done, path, className = "btn btn-sm" }: {
  op: string; fields: Record<string, string>; children: ReactNode; done: string; path?: string; className?: string;
}) {
  const [state, setState] = useState<"idle" | "done">("idle");
  const [, start] = useTransition();
  const run = () => {
    setState("done");
    haptic("success");
    start(async () => {
      const fd = new FormData();
      fd.set("_a", op);
      if (path) fd.set("_path", path);
      for (const [k, v] of Object.entries(fields)) fd.set(k, v);
      const r: { error?: string; ok?: string } | undefined = await runAction(undefined, fd).catch(() => ({ error: "That didn't save. Try again." }));
      if (r?.error) { setState("idle"); haptic("error"); toast({ message: r.error, tone: "bad" }); }
      else toast({ message: r?.ok ?? done, tone: "ok" });
    });
  };
  return state === "done"
    ? <span className="pill ok opt-badge-inline" role="status">{done}</span>
    : <button type="button" className={className} onClick={run}>{children}</button>;
}
