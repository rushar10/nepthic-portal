import { getAdmin } from "@/core/auth";
import { fetchSiteFile } from "@/core/ops";
import { isSiteKey } from "@/core/sites";

export const dynamic = "force-dynamic";

/** Images from a site (return photos, event galleries) shown inside the portal, fetched with the
    portal's signed token so private files never need a public link. */
export async function GET(_: Request, { params }: { params: Promise<{ site: string; id: string }> }) {
  const a = await getAdmin();
  const { site, id } = await params;
  if (!a || !isSiteKey(site) || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const res = await fetchSiteFile(a, site, id);
  if (!res) return new Response("Not found", { status: 404 });
  return new Response(res.body, { headers: { "content-type": res.headers.get("content-type") ?? "application/octet-stream", "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" } });
}
