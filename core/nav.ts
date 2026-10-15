import { can, isSuper, type Who } from "./perms";
import { SITES, type SiteKey } from "./sites";

export type NavItem = { href: string; label: string; icon: string; badge?: number; match?: string[]; group?: "main" | "admin" };
export type Section = "portal" | SiteKey;
export type Counts = Partial<Record<SiteKey, { total: number; [k: string]: number }>>;

/** Navigation for each section of the portal, limited to what this person may open. */
export function navFor(a: Who, counts: Counts): Record<Section, NavItem[]> {
  const ws = counts.wholesale, ev = counts.events, clo = counts.clothing;
  const pick = (site: SiteKey, items: (NavItem & { level?: "view" | "manage" })[]) =>
    can(a, site, "view") ? items.filter((i) => can(a, site, i.level ?? "view")).map(({ level: _l, ...i }) => i) : [];

  return {
    portal: [
      { href: "/", label: "Overview", icon: "chart", match: [] },
      ...(isSuper(a) ? [
        { href: "/admins", label: "Admins & roles", icon: "shield", group: "admin" as const },
        { href: "/audit", label: "Audit log", icon: "history", group: "admin" as const },
      ] : []),
      { href: "/account", label: "Your account", icon: "user", group: "admin" },
    ],
    clothing: pick("clothing", [
      { href: "/clothing", label: "Clothing overview", icon: "chart", match: [] },
      { href: "/clothing/products", label: "Products", icon: "shirt" },
      { href: "/clothing/inventory", label: "Inventory", icon: "layers", badge: clo?.lowStock },
      { href: "/clothing/orders", label: "Orders", icon: "bag", badge: clo?.orders },
      { href: "/clothing/customers", label: "Customers", icon: "users" },
      { href: "/clothing/discounts", label: "Discounts", icon: "card", level: "manage", group: "admin" },
    ]),
    wholesale: pick("wholesale", [
      { href: "/wholesale", label: "Wholesale dashboard", icon: "chart", match: [] },
      { href: "/wholesale/approvals", label: "Approvals", icon: "inbox", badge: ws?.total },
      { href: "/wholesale/quotes", label: "Quotes & enquiries", icon: "chat", badge: ws?.quotes },
      { href: "/wholesale/orders", label: "Bulk orders", icon: "box" },
      { href: "/wholesale/products", label: "Products & stock", icon: "shirt" },
      { href: "/wholesale/businesses", label: "Business accounts", icon: "users", badge: ws?.businesses },
      { href: "/wholesale/customers", label: "Buyers", icon: "user" },
      { href: "/wholesale/returns", label: "Return approvals", icon: "undo", badge: ws?.returns },
      { href: "/wholesale/pricing", label: "Pricing tiers", icon: "grid" },
      { href: "/wholesale/payments", label: "Payments", icon: "card", level: "manage", group: "admin" },
      { href: "/wholesale/settings", label: "Settings & payment mode", icon: "cog", level: "manage", group: "admin" },
    ]),
    events: pick("events", [
      { href: "/events", label: "Events dashboard", icon: "chart", match: [] },
      { href: "/events/events", label: "Events & tickets", icon: "calendar" },
      { href: "/events/refunds", label: "Refund approvals", icon: "undo", badge: ev?.refunds },
      { href: "/events/checkin", label: "Check-in", icon: "scan" },
      { href: "/events/scans", label: "Door scans", icon: "log" },
      { href: "/events/customers", label: "Customers", icon: "users" },
      { href: "/events/payments", label: "Sales & payments", icon: "card", level: "manage", group: "admin" },
      { href: "/events/partners", label: "Partners", icon: "store" },
      { href: "/events/physical", label: "Physical tickets", icon: "box" },
      { href: "/events/tickets", label: "Ticket search", icon: "search" },
      { href: "/events/reports", label: "Partner reports", icon: "pie" },
      { href: "/events/ticket-settings", label: "Ticket settings", icon: "grid", level: "manage", group: "admin" },
      { href: "/events/templates", label: "Ticket templates", icon: "ticket", level: "manage", group: "admin" },
      { href: "/events/door-staff", label: "Scanner staff", icon: "key", level: "manage", group: "admin" },
      { href: "/events/settings", label: "Settings", icon: "cog", level: "manage", group: "admin" },
    ]),
  };
}

export const switcherItems = (sites: SiteKey[], counts: Counts) => [
  { key: "portal", href: "/", label: "Overview", color: "#8B5CF6", strong: "#7C3AED", n: 0 },
  ...sites.map((k) => ({ key: k, href: `/${k}`, label: SITES[k].short, color: SITES[k].accent, strong: k === "clothing" ? "#A35F00" : k === "wholesale" ? "#0F766E" : "#BE185D", n: counts[k]?.total ?? 0 })),
];
