"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { confirmWith2fa, requireAdmin } from "@/core/auth";
import { callSite } from "@/core/ops";
import { audit } from "@/core/audit";
import { ACTIONS, formToInput } from "@/core/actions-meta";
import { can } from "@/core/perms";
import type { FormState } from "@/ui/Forms";

/* One server action for every site action in the portal (see core/actions-meta.ts):
   check the role → 2FA again if sensitive → call the site's admin API → audit → refresh. */

const META_FIELDS = (k: string) => k.startsWith("_") || k === "confirmCode" || k.startsWith("$ACTION");

export async function runAction(_: FormState, fd: FormData): Promise<FormState> {
  const a = await requireAdmin();
  const key = String(fd.get("_a") ?? "");
  const meta = Object.hasOwn(ACTIONS, key) ? ACTIONS[key] : undefined;
  if (!meta) return { error: "Unknown action." };
  const input = formToInput(fd, META_FIELDS);
  const target = String(input.id ?? input.quoteId ?? input.orderId ?? input.productId ?? input.businessId ?? input.returnId ?? input.refundId ?? input.eventId ?? input.typeId ?? "") || null;

  if (!can(a, meta.site, meta.level)) {
    await audit({ admin: a, site: meta.site, action: meta.op, target, outcome: "denied", detail: { reason: "role" } });
    return { error: "Your role can't do that on this site." };
  }
  if (meta.sensitive?.(input)) {
    const problem = await confirmWith2fa(a, String(fd.get("confirmCode") ?? "").trim());
    if (problem) {
      await audit({ admin: a, site: meta.site, action: meta.op, target, outcome: "denied", detail: { reason: "2fa confirmation missing or wrong" } });
      return { error: problem };
    }
  }

  const files: Record<string, File[]> = {};
  for (const f of meta.files ?? []) files[f] = fd.getAll(f).filter((v): v is File => typeof v === "object" && v.size > 0);

  const r = await callSite<{ ok?: string } & Record<string, unknown>>(a, meta.site, meta.op, input, { level: meta.level, files });
  await audit({ admin: a, site: meta.site, action: meta.op, target, outcome: r.ok ? "ok" : r.kind === "forbidden" ? "denied" : "failed", detail: r.ok ? { result: r.data?.ok } : { error: r.error } });
  if (!r.ok) return { error: r.error };

  const path = String(fd.get("_path") ?? "");
  if (path.startsWith("/")) revalidatePath(path);
  const go = String(fd.get("_redirect") ?? "");
  if (go.startsWith("/")) redirect(go.replace(/\{(\w+)\}/g, (_m, k: string) => encodeURIComponent(String(r.data?.[k] ?? ""))));
  return { ok: r.data?.ok ?? "Done." };
}
