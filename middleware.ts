import { NextResponse, type NextRequest } from "next/server";
import { ipAllowed } from "@/core/ip";

/* First gate for every portal request (the real session check happens on the server for each
   page and action):
   - Optional IP allowlist (PORTAL_IP_ALLOWLIST): anyone else gets a plain 404.
   - No session cookie at all → the login screen. Nothing else is rendered for them. */

const PUBLIC = [/^\/login(\/|$)/, /^\/robots\.txt$/, /^\/icon\.png$/, /^\/apple-icon\.png$/, /^\/scan-sw\.js$/, /^\/scan-manifest\.webmanifest$/];
const COOKIES = ["__Host-nep_portal", "nep_portal"];

export function middleware(req: NextRequest) {
  const list = (process.env.PORTAL_IP_ALLOWLIST ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length) {
    const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
    if (!ipAllowed(ip, list)) return new NextResponse("Not found", { status: 404, headers: { "x-robots-tag": "noindex, nofollow" } });
  }
  const path = req.nextUrl.pathname;
  if (PUBLIC.some((r) => r.test(path))) return NextResponse.next();
  if (!COOKIES.some((c) => req.cookies.has(c))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
