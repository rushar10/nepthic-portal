import Link from "next/link";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import type { CloProduct } from "@/core/clothing";

export const metadata = { title: "Clothing inventory" };

type D = { show: "low" | "all"; threshold: number; products: CloProduct[]; lowCount: number };

/* Stock per size for the retail store (separate from Wholesale's own allocation). Enter a new
   count, or +n / -n to adjust. */
export default async function Inventory({ searchParams }: { searchParams: Promise<{ show?: string; q?: string }> }) {
  const a = await requireSite("clothing");
  const { show, q } = await searchParams;
  const r = await callSite<D>(a, "clothing", "inventory.list", { show, q });
  const all = show === "all";
  const path = `/clothing/inventory${all ? "?show=all" : ""}`;
  const head = (
    <SectionHead site="clothing" title="Inventory" livePath="/" sub="Retail stock per size. Type the new count, or +12 / -3 to adjust. Wholesale keeps its own allocation.">
      <nav className="row" aria-label="Filter">
        <Link className="tab" href="/clothing/inventory" aria-current={!all ? "page" : undefined}>Low stock{r.ok ? ` · ${r.data.lowCount}` : ""}</Link>
        <Link className="tab" href="/clothing/inventory?show=all" aria-current={all ? "page" : undefined}>All</Link>
      </nav>
    </SectionHead>
  );
  if (!r.ok) return <>{head}<SiteProblem site="clothing" r={r} /></>;
  const { products, threshold } = r.data;

  return (
    <>
      {head}
      <div className="cards">
        {products.map((p) => (
          <OpForm key={p.id} op="clothing:stock.save" path={path} className="card prox" id={p.slug}>
            <input type="hidden" name="productId" value={p.id} />
            <div className="spread">
              <div><b>{p.name}</b> <span className="dim small">{p.category}{p.status === "DRAFT" ? " · draft" : ""}</span></div>
              <span className="pill">{p.variants.reduce((n, v) => n + v.stock, 0)} total</span>
            </div>
            <div className="row" style={{ alignItems: "end" }}>
              {p.variants.map((v) => (
                <label key={v.id} className={`f stock-cell${v.stock === 0 ? " out" : v.stock <= threshold ? " low" : ""}`} style={{ width: 92 }}>
                  <span>{v.size} <span className="dim small">{v.stock === 0 ? "· out" : v.stock <= threshold ? "· low" : ""}</span></span>
                  <input type="text" inputMode="numeric" name={`stock[${v.id}]`} defaultValue={v.stock} pattern="[+\-]?[0-9]{1,6}" aria-label={`${p.name} ${v.size} stock (${v.sku})`} />
                </label>
              ))}
              <label className="f" style={{ width: 92 }}>New size<input type="text" name="newSize" placeholder="XXXL" maxLength={8} /></label>
              <label className="f" style={{ width: 82 }}>Stock<input type="number" name="newStock" min="0" placeholder="0" /></label>
              <Submit className="btn btn-sm prox" pendingText="Saving…">Save stock</Submit>
            </div>
          </OpForm>
        ))}
        {products.length === 0 && <div className="empty">{all ? "No products yet." : `Nothing at ${threshold} or fewer. Every size is stocked.`}</div>}
      </div>
    </>
  );
}
