import { randomUUID } from "node:crypto";
import { importPKCS8, SignJWT, type KeyLike } from "jose";
import { env } from "./env";
import { SITES, type SiteKey } from "./sites";
import { can, type Level } from "./perms";
import type { PortalAdmin } from "./auth";

/* ---------------------------------------------------------------------------
   The portal's client for each site's admin API.

   Every call carries a fresh token signed with the portal's Ed25519 private key:
     iss "nepthic-portal" · aud "<site>" · sub admin id · 60-second lifetime · unique jti
     nep { email, name, role, sites }   (the role claims the site checks again itself)
   The portal checks the role first too, so a forbidden call is never even sent.

   A site that doesn't answer within 4 seconds, or answers 5xx, is "unavailable": its section
   says so and the other sites carry on as normal.
--------------------------------------------------------------------------- */

export type OpResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "unavailable" | "not-connected" | "forbidden" | "error"; error: string; status?: number };

let key: Promise<KeyLike> | null = null;
const privateKey = () => (key ??= importPKCS8(env.privateKey, "EdDSA"));

type Caller = Pick<PortalAdmin, "id" | "email" | "name" | "role" | "sites">;

export async function signFor(a: Caller, audience: string, extra: Record<string, unknown> = {}, ttl = "60s") {
  return new SignJWT({ nep: { email: a.email, name: a.name, role: a.role, sites: a.role === "SUPER" ? ["clothing", "wholesale", "events"] : a.sites, ...extra } })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setIssuer("nepthic-portal").setAudience(audience).setSubject(a.id)
    .setIssuedAt().setExpirationTime(ttl).setJti(randomUUID())
    .sign(await privateKey());
}

export async function callSite<T = unknown>(
  a: Caller, site: SiteKey, op: string, input: Record<string, unknown> = {},
  opts: { level?: Level; files?: Record<string, File[]>; timeoutMs?: number } = {},
): Promise<OpResult<T>> {
  const name = SITES[site].short;
  if (!can(a, site, opts.level ?? "view")) return { ok: false, kind: "forbidden", error: "Your role can't do that on this site." };
  const base = env.sites[site].api;
  if (!base) return { ok: false, kind: "not-connected", error: `${name} isn't connected to the portal yet.` };

  let body: BodyInit;
  const headers: Record<string, string> = { authorization: `Bearer ${await signFor(a, site)}` };
  const fileEntries = Object.entries(opts.files ?? {}).flatMap(([k, list]) => list.filter((f) => f && f.size > 0).map((f) => [k, f] as const));
  if (fileEntries.length) {
    const fd = new FormData();
    fd.set("input", JSON.stringify(input));
    for (const [k, f] of fileEntries) fd.append(k, f, f.name);
    body = fd;
  } else {
    body = JSON.stringify(input);
    headers["content-type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/ops/v1/${encodeURIComponent(op)}`, { method: "POST", headers, body, cache: "no-store", signal: AbortSignal.timeout(opts.timeoutMs ?? (fileEntries.length ? 30000 : 4000)) });
  } catch {
    return { ok: false, kind: "unavailable", error: `${name} isn't answering right now. The other sites are unaffected.` };
  }
  if (res.status >= 500 && res.status !== 502) return { ok: false, kind: "unavailable", error: `${name} had a problem answering. Try again in a moment.`, status: res.status };
  const json = (await res.json().catch(() => null)) as { data?: T; error?: string } | null;
  if (res.status === 404 && !json) return { ok: false, kind: "unavailable", error: `${name}'s admin API didn't accept the portal's request. Check PORTAL_PUBLIC_KEY on that site.`, status: 404 };
  if (!res.ok || !json || json.error) return { ok: false, kind: res.status === 403 ? "forbidden" : "error", error: json?.error ?? `${name} refused the request.`, status: res.status };
  return { ok: true, data: json.data as T };
}

/** Fetches a private file (e.g. a return photo) from a site for the portal to pass on. */
export async function fetchSiteFile(a: Caller, site: SiteKey, id: string) {
  const base = env.sites[site].api;
  if (!base || !can(a, site, "view")) return null;
  try {
    const res = await fetch(`${base}/api/ops/v1/file/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${await signFor(a, site)}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}
