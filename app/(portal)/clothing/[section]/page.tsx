import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { CLOTHING_SECTIONS } from "@/core/clothing";

export default async function ClothingSection({ params }: { params: Promise<{ section: string }> }) {
  const a = await requireSite("clothing");
  const { section } = await params;
  const s = CLOTHING_SECTIONS.find((x) => x.key === section);
  if (!s) notFound();
  const r = await callSite(a, "clothing", `${s.key}.list`, {}, { level: s.key === "discounts" ? "manage" : "view" });
  return (
    <>
      <Link className="btn btn-ghost btn-sm" href="/clothing" style={{ justifySelf: "start" }}>← Clothing</Link>
      <SectionHead site="clothing" title={s.label} livePath={null} sub={s.what} />
      {!r.ok ? <SiteProblem site="clothing" r={r} /> : <pre className="panel small">{JSON.stringify(r.data, null, 2).slice(0, 4000)}</pre>}
    </>
  );
}
