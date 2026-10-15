/* Shapes of what the Clothing admin API returns (clothing-kit/nepthic-admin/store.ts). */
export type CloVariant = { id: string; size: string; sku: string; stock: number };
export type CloProduct = {
  id: string; slug: string; name: string; category: string; description: string; priceCents: number; compareAtCents: number | null;
  imageUrl: string | null; status: "ACTIVE" | "DRAFT" | "ARCHIVED"; variants: CloVariant[]; updatedAt: string;
};
export type CloOrder = {
  id: string; number: string; createdAt: string; email: string; customerName: string; customerId: string | null;
  lines: { productId: string | null; name: string; size: string; sku: string; qty: number; unitCents: number }[];
  subtotalCents: number; discountCents: number; discountCode: string | null; shippingCents: number; totalCents: number; refundedCents: number;
  status: "PAID" | "FULFILLED" | "PARTIALLY_REFUNDED" | "REFUNDED"; fulfilledAt: string | null; carrier: string | null; tracking: string | null; shipTo: string;
};
export type CloCustomer = { id: string; name: string; email: string; createdAt: string; orders: number; spentCents: number; lastOrderAt: string | null; marketing: boolean };
export type CloDiscount = {
  id: string; code: string; kind: "PERCENT" | "FIXED"; value: number; minSpendCents: number; startsAt: string | null; endsAt: string | null;
  usageLimit: number | null; used: number; active: boolean;
};
export type CloSummary = {
  revenue: { last30Cents: number; prev30Cents: number }; today: { totalCents: number; orders: number };
  orders: { now: number; prev: number }; units: { now: number; prev: number }; toFulfil: number; oldestOpenAt: string | null;
  lowStock: { count: number; threshold: number; items: { productId: string; slug: string; name: string; size: string; sku: string; stock: number }[] };
  products: { active: number; draft: number };
  recent: { id: string; number: string; createdAt: string; customerName: string; totalCents: number; status: CloOrder["status"] }[];
  pending: { toFulfil: number; total: number };
};

export const ORDER_LABEL: Record<CloOrder["status"], [string, string]> = {
  PAID: ["To ship", "warn"], FULFILLED: ["Shipped", "ok"], PARTIALLY_REFUNDED: ["Part refunded", "info"], REFUNDED: ["Refunded", "bad"],
};
export const PRODUCT_LABEL: Record<CloProduct["status"], [string, string]> = { ACTIVE: ["Active", "ok"], DRAFT: ["Draft", ""], ARCHIVED: ["Archived", "bad"] };
export const CLO_CATEGORIES = ["Tees", "Hoodies", "Crewnecks", "Outerwear", "Bottoms", "Headwear", "Accessories"];

export function discountState(d: CloDiscount, now = new Date()) {
  if (!d.active) return ["Paused", ""] as const;
  if (d.endsAt && new Date(d.endsAt) < now) return ["Ended", "bad"] as const;
  if (d.startsAt && new Date(d.startsAt) > now) return ["Scheduled", "info"] as const;
  if (d.usageLimit !== null && d.used >= d.usageLimit) return ["Used up", "warn"] as const;
  return ["Live", "ok"] as const;
}
