import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { Submit } from "@/ui/Forms";
import { dateShort, time } from "@/ui/format";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";

export const metadata = { title: "Wholesale products" };

type P = {
  id: string; slug: string; name: string; category: string; priceCents: number; imageUrl: string | null; wholesaleEnabled: boolean;
  sourceId: string | null; syncedAt: string | null; variants: { id: string; size: string; stock: number }[];
};
type Run = { id: string; startedAt: string; finishedAt: string | null; trigger: string; status: string; error: string | null; created: number; updated: number; archived: number };
type D = { live: P[]; archived: { id: string; name: string; archivedAt: string }[]; runs: Run[]; source: string };

export default async function Products() {
  const a = await requireSite("wholesale");
  const r = await callSite<D>(a, "wholesale", "products.list");
  if (!r.ok) return <><SectionHead site="wholesale" title="Products & stock" livePath="/catalogue" /><SiteProblem site="wholesale" r={r} /></>;
  const { live, archived, runs, source } = r.data;
  const lastOk = runs.find((x) => x.status === "SUCCEEDED");
  const path = "/wholesale/products";

  return (
    <>
      <SectionHead site="wholesale" title="Products & stock" livePath="/catalogue"
        sub="Products come from the Clothing catalogue on a schedule and are stored on Wholesale, so it keeps selling even when Clothing is offline. Names, RRPs and sizes follow Clothing. Wholesale stock, listing and wholesale-only products are managed here." />

      <section className="panel prox" aria-labelledby="imp">
        <div className="spread">
          <div>
            <h2 className="h3" id="imp">Catalogue import</h2>
            <p className="small dim" style={{ marginTop: 4 }}>
              Source: {source} · runs daily at 3am Brisbane time{lastOk ? ` · last good copy ${dateShort(lastOk.finishedAt ?? lastOk.startedAt)} ${time(lastOk.finishedAt ?? lastOk.startedAt)}` : " · no successful import yet"}
            </p>
          </div>
          <OpForm op="wholesale:catalogue.import" path={path}><Submit className="btn btn-sm prox" pendingText="Importing…">Import now</Submit></OpForm>
        </div>
        {runs.length > 0 && (
          <div className="scroll"><table className="tbl rtable">
            <thead><tr><th>Started</th><th>Trigger</th><th>Result</th><th className="num">New</th><th className="num">Updated</th><th className="num">Archived</th></tr></thead>
            <tbody>
              {runs.map((x) => (
                <tr key={x.id}>
                  <td className="small">{dateShort(x.startedAt)} {time(x.startedAt)}</td>
                  <td data-label="Trigger" className="small">{x.trigger}</td>
                  <td data-label="Result">{x.status === "SUCCEEDED" ? <span className="pill ok">Imported</span> : x.status === "FAILED" ? <span className="pill bad" title={x.error ?? ""}>Failed: {x.error?.slice(0, 80)}</span> : <span className="pill info">Running</span>}</td>
                  <td className="num" data-label="New">{x.created}</td><td className="num" data-label="Updated">{x.updated}</td><td className="num" data-label="Archived">{x.archived}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      <div className="cards">
        {live.map((p) => {
          const total = p.variants.reduce((n, v) => n + v.stock, 0);
          const low = p.variants.filter((v) => v.stock < 20).length;
          const imported = !!p.sourceId;
          return (
            <OpForm key={p.id} op="wholesale:product.save" path={path} className="card prox" id={p.slug}>
              <input type="hidden" name="productId" value={p.id} />
              <div className="spread">
                <div><b>{p.name}</b> <span className="dim small">{p.category} · /{p.slug}</span></div>
                <div className="row">
                  {imported ? <span className="pill info" title={`Clothing id ${p.sourceId}`}>From Clothing{p.syncedAt ? ` · synced ${dateShort(p.syncedAt)}` : ""}</span> : <span className="pill">Wholesale only</span>}
                  <span className="pill">{total} allocated</span>
                  {low > 0 && <span className="pill warn">{low} size{low > 1 ? "s" : ""} under 20</span>}
                </div>
              </div>
              <div className="row" style={{ alignItems: "end" }}>
                <label className="f" style={{ width: 120 }}>RRP ($)
                  <input type="number" name="price" step="0.01" min="0" defaultValue={(p.priceCents / 100).toFixed(2)} readOnly={imported} title={imported ? "Set by the Clothing catalogue" : undefined} />
                </label>
                {p.variants.map((v) => (
                  <label key={v.id} className="f" style={{ width: 82 }}>{v.size}<input type="number" name={`stock[${v.id}]`} min="0" defaultValue={v.stock} aria-label={`${p.name} ${v.size} wholesale stock`} /></label>
                ))}
                {!imported && <>
                  <label className="f" style={{ width: 82 }}>New size<input type="text" name="newSize" placeholder="XXXL" /></label>
                  <label className="f" style={{ width: 82 }}>Stock<input type="number" name="newStock" min="0" placeholder="0" /></label>
                </>}
              </div>
              {imported && <p className="small dim">RRP, name and sizes follow the Clothing catalogue. Stock here is the wholesale allocation.</p>}
              <div className="row">
                <label className="row small"><input type="checkbox" name="wholesaleEnabled" defaultChecked={p.wholesaleEnabled} /> Listed on Wholesale</label>
                {!imported && <label className="f" style={{ flex: 1, minWidth: 220 }}><span className="sr-only">Image URL</span><input type="text" name="imageUrl" defaultValue={p.imageUrl ?? ""} placeholder="Image URL (optional)" /></label>}
                <Submit className="btn btn-sm prox" pendingText="Saving…">Save</Submit>
              </div>
            </OpForm>
          );
        })}
        {live.length === 0 && <div className="empty">No products yet. Run an import, or add a wholesale-only product below.</div>}
      </div>

      {archived.length > 0 && (
        <section className="panel prox">
          <h2 className="h3">No longer in the Clothing catalogue</h2>
          <p className="small dim">Hidden from buyers and kept for past orders. They come back automatically if Clothing lists them again.</p>
          <ul className="small">{archived.map((p) => <li key={p.id}>{p.name} · archived {dateShort(p.archivedAt)}</li>)}</ul>
        </section>
      )}

      <OpForm op="wholesale:product.create" path={path} className="panel prox">
        <h2 className="h3">Add a wholesale-only product</h2>
        <p className="small dim">For trade-only lines that aren&apos;t sold on the Clothing store. The import never touches these.</p>
        <div className="form-grid">
          <label className="f">Name<input type="text" name="name" required /></label>
          <label className="f">Category<select name="category">{["Tees", "Hoodies", "Crewnecks", "Outerwear", "Bottoms", "Headwear"].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="f">RRP ($)<input type="number" name="price" step="0.01" min="0" required /></label>
          <label className="f">Sizes (comma separated)<input type="text" name="sizes" defaultValue="S, M, L, XL, XXL" required /></label>
          <label className="f">Starting stock per size<input type="number" name="stock" min="0" defaultValue={0} /></label>
          <label className="f">Link (optional)<input type="text" name="slug" placeholder="auto from name" /></label>
          <label className="f full">Description<textarea name="description" /></label>
        </div>
        <label className="row small"><input type="checkbox" name="wholesaleEnabled" defaultChecked /> List on Wholesale</label>
        <Submit pendingText="Adding…">Add product</Submit>
      </OpForm>
    </>
  );
}
