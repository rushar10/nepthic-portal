import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { aud, dateShort } from "@/ui/format";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { CLO_CATEGORIES, PRODUCT_LABEL, type CloProduct } from "@/core/clothing";

export const metadata = { title: "Clothing products" };
const dollars = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));

/* Products on the retail store. Saving changes the live store straight away; the Wholesale
   copy follows on its next catalogue import. */
export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const a = await requireSite("clothing");
  const { q } = await searchParams;
  const r = await callSite<{ products: CloProduct[] }>(a, "clothing", "products.list", { q });
  const path = `/clothing/products${q ? `?q=${encodeURIComponent(q)}` : ""}`;
  const head = (
    <SectionHead site="clothing" title="Products" livePath="/" sub="Names, prices, photos and what's on sale. Changes go live straight away; Wholesale picks them up on its next catalogue import.">
      <form className="row" role="search"><input type="search" name="q" defaultValue={q} placeholder="Name, category or SKU" aria-label="Search products" style={{ width: 220 }} /><button className="btn btn-sm">Search</button></form>
    </SectionHead>
  );
  if (!r.ok) return <>{head}<SiteProblem site="clothing" r={r} /></>;
  const list = r.data.products;

  return (
    <>
      {head}
      <div className="cards">
        {list.map((p) => {
          const stock = p.variants.reduce((n, v) => n + v.stock, 0);
          const [label, tone] = PRODUCT_LABEL[p.status];
          return (
            <OpForm key={p.id} op="clothing:product.save" path={path} className="card prox" id={p.slug}>
              <input type="hidden" name="productId" value={p.id} />
              <div className="spread">
                <div><b>{p.name}</b> <span className="dim small">/{p.slug} · updated {dateShort(p.updatedAt)}</span></div>
                <div className="row">
                  <span className={`pill ${tone}`}>{label}</span>
                  <span className="pill">{stock} in stock · {p.variants.length} size{p.variants.length === 1 ? "" : "s"}</span>
                  {p.compareAtCents && <span className="pill info">On sale · was {aud(p.compareAtCents)}</span>}
                </div>
              </div>
              <div className="form-grid">
                <label className="f">Name<input type="text" name="name" defaultValue={p.name} required maxLength={120} /></label>
                <label className="f">Category<select name="category" defaultValue={p.category}>{CLO_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
                <label className="f">Price ($)<input type="number" name="price" step="0.01" min="0.01" defaultValue={dollars(p.priceCents)} required /></label>
                <label className="f">Was price ($), for a sale<input type="number" name="compareAt" step="0.01" min="0" placeholder="Not on sale" defaultValue={dollars(p.compareAtCents)} /></label>
                <label className="f">Status<select name="status" defaultValue={p.status}><option value="ACTIVE">Active (in the store)</option><option value="DRAFT">Draft (hidden)</option><option value="ARCHIVED">Archived (retired)</option></select></label>
                <label className="f">Image URL<input type="url" name="imageUrl" defaultValue={p.imageUrl ?? ""} placeholder="https://…" /></label>
                <label className="f full">Description<textarea name="description" defaultValue={p.description} rows={2} /></label>
              </div>
              <div className="row">
                <Submit className="btn btn-sm prox" pendingText="Saving…">Save</Submit>
                <a className="btn btn-sm btn-ghost" href={`/clothing/inventory?show=all#${p.slug}`}>Stock</a>
                {p.status === "ACTIVE" && <a className="btn btn-sm btn-ghost" href={`/go/clothing?path=${encodeURIComponent(`/products/${p.slug}`)}`} target="_blank" rel="noopener">View in store ↗</a>}
              </div>
            </OpForm>
          );
        })}
        {list.length === 0 && <div className="empty">{q ? "No products match." : "No products yet. Add the first one below."}</div>}
      </div>

      <OpForm op="clothing:product.create" path={path} className="panel prox">
        <h2 className="h3">Add a product</h2>
        <p className="small dim">New products start as a draft unless you choose Active. SKUs are made from the link name and size.</p>
        <div className="form-grid">
          <label className="f">Name<input type="text" name="name" required maxLength={120} /></label>
          <label className="f">Category<select name="category">{CLO_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="f">Price ($)<input type="number" name="price" step="0.01" min="0.01" required /></label>
          <label className="f">Sizes (comma separated)<input type="text" name="sizes" defaultValue="S, M, L, XL, XXL" required /></label>
          <label className="f">Starting stock per size<input type="number" name="stock" min="0" defaultValue={0} /></label>
          <label className="f">Link (optional)<input type="text" name="slug" placeholder="auto from name" /></label>
          <label className="f">Status<select name="status" defaultValue="DRAFT"><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option></select></label>
          <label className="f full">Description<textarea name="description" rows={2} /></label>
        </div>
        <Submit pendingText="Adding…">Add product</Submit>
      </OpForm>
    </>
  );
}
