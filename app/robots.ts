import type { MetadataRoute } from "next";

/** The portal is never listed: robots are turned away, and there is no sitemap. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
