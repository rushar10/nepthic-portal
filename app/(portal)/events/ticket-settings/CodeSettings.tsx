"use client";
import { useMemo, useState } from "react";
import {
  composeCode, formatProblems, formatWarnings, maxNumber, PART_LABELS, PREFIX_MAX, prefixFor, previewCodes, SCOPE_LABELS, scopeKey,
  type CodeFormat, type CodePart,
} from "@/core/ticket-code-format";
import { DEFAULT_TEMPLATE, printTicketSvg, SAMPLE_DATA } from "@/core/ticket-design";

type Type = { id: string; name: string; codePrefix: string; fallback: string; zone: string };
type Partner = { id: string; name: string; code: string };
const ALL_PARTS: CodePart[] = ["brand", "type", "partner", "date"];

/* Ticket code settings with a live preview of the next codes and of the printed ticket.
   Uses the same code functions as the Events site (core/ticket-code-format.ts). */
export function CodeSettings({ initial, types, partners, counters, ranges, issued, eventDate, formats, gates, qr }: {
  initial: CodeFormat; types: Type[]; partners: Partner[]; counters: { key: string; next: number }[];
  ranges: { partner: string; type: string; start: number; end: number }[]; issued: number; eventDate: string;
  formats: string[]; gates: string[]; qr: boolean[][];
}) {
  const [f, setF] = useState<CodeFormat>(initial);
  const [typeCodes, setTypeCodes] = useState<Record<string, string>>(Object.fromEntries(types.map((t) => [t.id, t.codePrefix])));
  const [samplePartner, setSamplePartner] = useState(partners[0]?.id ?? "");
  const set = <K extends keyof CodeFormat>(k: K, v: CodeFormat[K]) => setF((x) => ({ ...x, [k]: v }));
  const parts = [...f.parts, ...ALL_PARTS.filter((p) => !f.parts.includes(p))];
  const move = (p: CodePart, d: -1 | 1) => {
    const on = [...f.parts]; const i = on.indexOf(p); const j = i + d;
    if (i < 0 || j < 0 || j >= on.length) return;
    [on[i], on[j]] = [on[j], on[i]]; set("parts", on);
  };
  const toggle = (p: CodePart) => set("parts", f.parts.includes(p) ? f.parts.filter((x) => x !== p) : [...f.parts, p]);
  const typePrefix = (t: Type) => (typeCodes[t.id] || t.fallback).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const partner = partners.find((p) => p.id === samplePartner);
  const date = new Date(eventDate);
  const ctxCodes = { typePrefixes: types.map(typePrefix), partnerCodes: f.parts.includes("partner") ? partners.map((p) => p.code.replace(/[^A-Z0-9]/g, "")) : [] };
  const problems = formatProblems(f, ctxCodes);
  const warnings = formatWarnings(f, ctxCodes);
  const nextFor = (ctx: { typeId?: string; partnerId?: string | null }) => {
    const c = counters.find((x) => x.key === scopeKey(f, ctx));
    return Math.max(c?.next ?? f.start, f.start);
  };
  const rows = types.map((t) => {
    const ctx = { typeId: t.id, typePrefix: typePrefix(t), date };
    const pctx = { ...ctx, partnerId: partner?.id ?? null, partnerCode: partner?.code ?? null };
    return { t, direct: previewCodes(f, ctx, nextFor(ctx), 2), viaPartner: partner ? previewCodes(f, pctx, nextFor(pctx), 1)[0] : null, prefix: prefixFor(f, ctx) };
  });
  const sampleCode = rows[0]?.direct[0] ?? composeCode(f, {}, f.start);
  const printed = useMemo(() => printTicketSvg(DEFAULT_TEMPLATE, { ...SAMPLE_DATA, code: sampleCode, serial: String(nextFor({ typeId: types[0]?.id })).padStart(f.padding, "0"), typeName: types[0]?.name ?? "General admission", zone: types[0]?.zone || undefined, partnerLabel: partner ? `Sold by: ${partner.name} / ${partner.code}` : undefined }, qr, { format: "stub", seed: "preview" }), // eslint-disable-line react-hooks/exhaustive-deps
    [sampleCode, partner, f.padding]);

  return (
    <div className="tpl-editor">
      <div className="tpl-preview">
        <div className="panel" style={{ display: "grid", gap: 10 }}>
          <b>Next codes</b>
          <div className="scroll"><table className="tbl small">
            <thead><tr><th>Ticket type</th><th>Next (direct)</th><th>{partner ? `Next via ${partner.code}` : "Via a partner"}</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.t.id}><td>{r.t.name}</td><td className="mono">{r.direct.join("  ")}</td><td className="mono">{r.viaPartner ?? "—"}</td></tr>)}</tbody>
          </table></div>
          <span className="code-preview" aria-live="polite">Next ticket: {sampleCode}</span>
          {partners.length > 0 && <label className="row small">Preview partner<select value={samplePartner} onChange={(e) => setSamplePartner(e.target.value)}>{partners.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label>}
          {warnings.length > 0 && problems.length === 0 && <ul className="alert-list small">{warnings.map((p) => <li key={p} className="warn">{p}</li>)}</ul>}
          {problems.length > 0 ? <ul className="alert-list small">{problems.map((p) => <li key={p} className="bad">{p}</li>)}</ul> : <p className="small dim" role="status">Looks good. Every code is checked for uniqueness when it&apos;s issued; numbers in reserved partner ranges are skipped by everyone else.</p>}
        </div>
        <div className="tpl-stage" dangerouslySetInnerHTML={{ __html: printed }} />
        <p className="small dim">How the code prints under the QR (stub ticket, default design). The QR carries a separate signed id, so the readable code can be sequential without being guessable.</p>
      </div>

      <div className="tpl-fields">
        <input type="hidden" name="format[parts]" value={f.parts.join(",")} />
        <fieldset className="tpl-check" style={{ display: "grid", gap: 6 }}>
          <legend className="small">Prefix parts, in order</legend>
          {parts.map((p) => {
            const on = f.parts.includes(p), i = f.parts.indexOf(p);
            return (
              <div key={p} className="row small" style={{ flexWrap: "nowrap" }}>
                <label className="row" style={{ flex: 1 }}><input type="checkbox" checked={on} onChange={() => toggle(p)} /> {PART_LABELS[p]}
                  <span className="dim mono">{p === "brand" ? f.brand : p === "type" ? types.map(typePrefix).join(" / ") : p === "partner" ? "partner code (P012…)" : prefixFor({ ...f, parts: ["date"] }, { date })}</span></label>
                <button type="button" className="btn btn-sm btn-ghost" disabled={!on || i === 0} onClick={() => move(p, -1)} aria-label={`Move ${PART_LABELS[p]} earlier`}>↑</button>
                <button type="button" className="btn btn-sm btn-ghost" disabled={!on || i === f.parts.length - 1} onClick={() => move(p, 1)} aria-label={`Move ${PART_LABELS[p]} later`}>↓</button>
              </div>
            );
          })}
        </fieldset>
        <div className="form-grid">
          <label className="f">Brand / event prefix<input type="text" name="format[brand]" value={f.brand} maxLength={PREFIX_MAX} onChange={(e) => set("brand", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="NEP" /></label>
          <label className="f">Separator<select name="format[separator]" value={f.separator} onChange={(e) => set("separator", e.target.value as CodeFormat["separator"])}><option value="-">Dash  (NEP-VIP-001)</option><option value="/">Slash  (NEP/VIP/001)</option><option value="">None  (NEPVIP001)</option></select></label>
          <label className="f">Date part<select name="format[dateStyle]" value={f.dateStyle} onChange={(e) => set("dateStyle", e.target.value as CodeFormat["dateStyle"])}><option value="YYYY">Year (2026)</option><option value="YY">Short year (26)</option><option value="MMDD">Month+day (1231)</option><option value="YYMMDD">Full (261231)</option></select></label>
          <label className="f">Starting number<input type="number" name="format[start]" min={0} value={f.start} onChange={(e) => set("start", Number(e.target.value))} /></label>
          <label className="f">Digits<input type="number" name="format[padding]" min={1} max={9} value={f.padding} onChange={(e) => set("padding", Number(e.target.value))} /></label>
          <label className="f">Increment<input type="number" name="format[increment]" min={1} max={1000} value={f.increment} onChange={(e) => set("increment", Number(e.target.value))} /></label>
          <label className="f full">Numbering<select name="format[scope]" value={f.scope} onChange={(e) => set("scope", e.target.value as CodeFormat["scope"])}>{Object.entries(SCOPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="f full">Numbers<select name="format[mode]" value={f.mode} onChange={(e) => set("mode", e.target.value as CodeFormat["mode"])}><option value="SEQUENTIAL">Sequential (0001, 0002…)</option><option value="RANDOM">Random / non-sequential (extra security)</option></select></label>
        </div>
        <label className="row small"><input type="checkbox" name="format[checkChar]" checked={f.checkChar} onChange={(e) => set("checkChar", e.target.checked)} /> Add a check character, so a mistyped code is caught at the door</label>
        <label className="row small"><input type="checkbox" name="format[avoidAmbiguous]" checked={f.avoidAmbiguous} onChange={(e) => set("avoidAmbiguous", e.target.checked)} /> Warn about confusing letters (O and I) in prefixes</label>

        <fieldset className="tpl-check" style={{ display: "grid", gap: 8 }}>
          <legend className="small">Per ticket type</legend>
          {types.map((t) => (
            <div key={t.id} className="form-grid">
              <label className="f">{t.name}: prefix<input type="text" name={`typeCode[${t.id}]`} value={typeCodes[t.id] ?? ""} placeholder={t.fallback} maxLength={8} onChange={(e) => setTypeCodes((x) => ({ ...x, [t.id]: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))} /></label>
              <label className="f">Seat / zone (printed)<input type="text" name={`zone[${t.id}]`} defaultValue={t.zone} maxLength={40} placeholder="e.g. Mezzanine" /></label>
            </div>
          ))}
        </fieldset>
        {partners.length > 0 && (
          <details className="small">
            <summary style={{ cursor: "pointer" }}>Partner prefix overrides (optional)</summary>
            <div className="form-grid" style={{ marginTop: 8 }}>
              {partners.map((p) => <label key={p.id} className="f">{p.name}<input type="text" name={`format[partnerPrefixes][${p.id}]`} defaultValue={initial.partnerPrefixes[p.id] ?? ""} placeholder={p.code} maxLength={10} onChange={(e) => setF((x) => ({ ...x, partnerPrefixes: { ...x.partnerPrefixes, [p.id]: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") } }))} /></label>)}
            </div>
          </details>
        )}

        <fieldset className="tpl-check">
          <legend className="small">Formats offered at checkout</legend>
          {[["ETICKET", "E-ticket"], ["PHYSICAL", "Physical ticket"], ["BOTH", "Both"]].map(([k, l]) => <label key={k} className="row small"><input type="checkbox" name={`formats[${k}]`} defaultChecked={formats.includes(k)} /> {l}</label>)}
        </fieldset>
        <label className="f">Gates / doors (comma separated, offered in the scanner)<input type="text" name="gates" defaultValue={gates.join(", ")} /></label>

        <div className="small dim">
          {issued} ticket{issued === 1 ? "" : "s"} already issued keep their codes; changes apply to new tickets only, and every change is in the audit log. Highest number with {f.padding} digits: {maxNumber(f)}.
          {ranges.length > 0 && <> Reserved partner ranges: {ranges.map((r) => `${r.partner} ${r.type} ${r.start}–${r.end}`).join("; ")}.</>}
        </div>
      </div>
    </div>
  );
}
