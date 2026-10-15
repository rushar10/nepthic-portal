import type { Level } from "./perms";
import type { SiteKey } from "./sites";

/* ---------------------------------------------------------------------------
   Every action the portal can send to a site, with the lowest role level that may send it
   and whether it needs the 2FA code again. The site checks the level again on its side.

   Sensitive (2FA re-entry, valid 5 minutes): refunds (Clothing, Wholesale, Events), payment terms and payment settings,
   cancelling events, and anything that adds or removes access. Portal account changes are
   in app/(portal)/admins/actions.ts and are all sensitive.
--------------------------------------------------------------------------- */

type In = Record<string, unknown>;
export type ActionMeta = { site: SiteKey; op: string; level: Level; label: string; sensitive?: (i: In) => boolean; files?: string[] };

const always = () => true;
const m = (site: SiteKey, op: string, level: Level, label: string, extra: Partial<ActionMeta> = {}): [string, ActionMeta] =>
  [`${site}:${op}`, { site, op, level, label, ...extra }];

export const ACTIONS: Record<string, ActionMeta> = Object.fromEntries([
  // Clothing: day-to-day
  m("clothing", "product.save", "operate", "Edit a product"),
  m("clothing", "product.create", "operate", "Add a product"),
  m("clothing", "stock.save", "operate", "Change stock"),
  m("clothing", "order.fulfil", "operate", "Mark an order shipped"),
  // Clothing: money and promotions
  m("clothing", "order.refund", "manage", "Refund an order", { sensitive: always }),
  m("clothing", "discount.save", "manage", "Create or edit a discount code"),
  m("clothing", "discount.active", "manage", "Pause or switch on a discount code"),
  // Wholesale: day-to-day
  m("wholesale", "quote.respond", "operate", "Answer a quote or enquiry"),
  m("wholesale", "order.requestBalance", "operate", "Request an order balance"),
  m("wholesale", "order.fulfilment", "operate", "Mark an order shipped or delivered"),
  m("wholesale", "product.save", "operate", "Edit a product's stock or listing"),
  m("wholesale", "product.create", "operate", "Add a wholesale-only product"),
  m("wholesale", "catalogue.import", "operate", "Import the Clothing catalogue"),
  // Wholesale: approvals, money, pricing, settings
  m("wholesale", "business.status", "manage", "Approve or reject a trade account"),
  m("wholesale", "business.terms", "manage", "Change a business's payment terms", { sensitive: always }),
  m("wholesale", "order.terms", "manage", "Change an order's payment terms", { sensitive: always }),
  m("wholesale", "order.cancel", "manage", "Cancel an unpaid order", { sensitive: always }),
  m("wholesale", "pricing.save", "manage", "Change pricing tiers"),
  m("wholesale", "return.decide", "manage", "Approve or reject a return"),
  m("wholesale", "return.complete", "manage", "Close a return (and refund)", { sensitive: (i) => parseFloat(String(i.refund ?? "0")) > 0 }),
  m("wholesale", "settings.save", "manage", "Change Wholesale settings, including the deposit / full payment mode", { sensitive: always }),
  // Events
  m("events", "event.save", "manage", "Create or edit an event", { files: ["cover", "gallery"], sensitive: (i) => i.status === "CANCELLED" }),
  m("events", "ticketType.save", "manage", "Change ticket types and capacity"),
  m("events", "gallery.remove", "manage", "Remove a gallery photo"),
  m("events", "refund.decide", "manage", "Approve or reject a ticket refund", { sensitive: (i) => i.decision === "APPROVED" }),
  m("events", "settings.save", "manage", "Change Events settings"),
  m("events", "template.save", "manage", "Create or edit a ticket template", { files: ["artEticket", "artStub"] }),
  m("events", "template.default", "manage", "Change the default ticket template"),
  m("events", "template.delete", "manage", "Delete a ticket template"),
  // Events: physical tickets, partners, ticket codes
  m("events", "partner.save", "manage", "Add or edit a partner"),
  m("events", "partner.status", "manage", "Suspend or reactivate a partner"),
  m("events", "allocation.save", "manage", "Allocate tickets to a partner"),
  m("events", "allocation.revoke", "manage", "Revoke a partner allocation", { sensitive: always }),
  m("events", "allocation.issue", "manage", "Issue e-tickets from a partner allocation"),
  m("events", "batch.create", "manage", "Generate physical tickets"),
  m("events", "batch.markPrinted", "operate", "Mark a print batch printed"),
  m("events", "tickets.stage", "operate", "Mark physical tickets distributed or sold"),
  m("events", "order.ship", "operate", "Mark physical tickets posted"),
  m("events", "order.pickedUp", "operate", "Mark physical tickets picked up"),
  m("events", "ticket.void", "manage", "Void a ticket", { sensitive: always }),
  m("events", "ticket.reissue", "manage", "Void and reissue a ticket", { sensitive: always }),
  m("events", "ticket.retag", "manage", "Change a ticket's partner tag", { sensitive: always }),
  m("events", "codes.save", "manage", "Change ticket code settings"),
  // Events partner accounts (their own allocations only)
  m("events", "partner.markSold", "partner", "Mark partner tickets sold"),
  m("events", "partner.issue", "partner", "Issue e-tickets as a partner"),
]);

/** Form field names like `stock[abc]` or `rows[0][min]` become nested objects and arrays. */
export function formToInput(fd: FormData, skip: (k: string) => boolean) {
  const out: In = {};
  for (const [name, value] of fd.entries()) {
    if (skip(name) || typeof value !== "string") continue;
    const path = name.replace(/\]/g, "").split("[");
    let cur: In | unknown[] = out;
    path.forEach((k, idx) => {
      const last = idx === path.length - 1;
      const nextIsIndex = !last && /^\d+$/.test(path[idx + 1]);
      const key = Array.isArray(cur) ? Number(k) : k;
      const holder = cur as Record<string | number, unknown>;
      if (last) holder[key] = value;
      else {
        holder[key] ??= nextIsIndex ? [] : {};
        cur = holder[key] as In | unknown[];
      }
    });
  }
  return out;
}
