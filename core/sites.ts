import { env } from "./env";

/* The three Nepthic sites as the portal sees them. Each section of the portal wears its site's
   accent so it's always clear which site is being managed. */
export type SiteKey = "clothing" | "wholesale" | "events";
export const SITE_KEYS: SiteKey[] = ["clothing", "wholesale", "events"];

export const SITES: Record<SiteKey, { key: SiteKey; name: string; short: string; accent: string; ink: string; cssVar: string; icon: string }> = {
  clothing: { key: "clothing", name: "Nepthic Clothing", short: "Clothing", accent: "#F5A524", ink: "var(--clo-ink)", cssVar: "var(--clo)", icon: "shirt" },
  wholesale: { key: "wholesale", name: "Nepthic Wholesale", short: "Wholesale", accent: "#2DD4BF", ink: "var(--ws-ink)", cssVar: "var(--ws)", icon: "box" },
  events: { key: "events", name: "Nepthic Events", short: "Events", accent: "#EC4899", ink: "var(--ev-ink)", cssVar: "var(--ev)", icon: "ticket" },
};

export const isSiteKey = (v: unknown): v is SiteKey => typeof v === "string" && (SITE_KEYS as string[]).includes(v);
export const siteUrl = (k: SiteKey) => env.sites[k].url;
export const siteConnected = (k: SiteKey) => !!env.sites[k].api;
