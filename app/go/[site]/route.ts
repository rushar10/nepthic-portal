import { getAdmin } from "@/core/auth";
import { signFor } from "@/core/ops";
import { can } from "@/core/perms";
import { env } from "@/core/env";
import { isSiteKey } from "@/core/sites";
import { audit } from "@/core/audit";

export const dynamic = "force-dynamic";

/* "View live site": opens the customer site with the admin preview bar.
   The portal signs a one-time token (60 seconds, audience "<site>-preview") and the browser
   POSTs it straight to the site, so it never appears in a URL, history or logs. The site turns
   it into a 30-minute preview session that only this browser has. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function GET(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const a = await getAdmin();
  const { site } = await params;
  if (!a || !isSiteKey(site) || !can(a, site, "view")) return new Response("Not found", { status: 404 });
  const base = env.sites[site].url;
  const raw = new URL(req.url).searchParams.get("path") ?? "/";
  const path = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  if (!env.sites[site].api) return Response.redirect(`${base}${path}`, 303); // not connected yet: plain link, no preview bar
  const token = await signFor(a, `${site}-preview`, { path });
  await audit({ admin: a, site, action: "preview.opened", target: path });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><title>Opening the live site…</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0E0B14;color:#F4F1FA;font:600 15px system-ui,sans-serif}</style></head>
<body><form id="f" method="post" action="${esc(base)}/api/ops/v1/preview"><input type="hidden" name="token" value="${esc(token)}"><noscript><button>Open the live site</button></noscript></form>
<p>Opening the live site with the admin preview bar…</p><script>document.getElementById("f").submit()</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow" } });
}
