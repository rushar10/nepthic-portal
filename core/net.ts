import { headers } from "next/headers";

/* The caller's IP. Behind a proxy/CDN (Vercel, Cloudflare) the first X-Forwarded-For entry is
   the client; set your proxy to overwrite, not append to, that header. */
export function ipFrom(h: Headers) {
  return (h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "").trim() || "unknown";
}
export async function clientIp() {
  return ipFrom(await headers());
}
export async function userAgent() {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}

export { ipAllowed } from "./ip";
