"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ART_QR_MIN, ART_SIZES, ART_TEXT, artOverlaps, artSampleValues, artTicketSvg, contrast, defaultArtSide, FIELD_LABELS, LAYOUTS, normalizeArt, PATTERNS, PRESETS, printTicketSvg, SAMPLE_DATA, ticketSvg,
  type ArtFont, type ArtKind, type ArtSide, type ArtTextKey, type TicketArtwork, type TicketData, type TicketFields, type TicketTemplate,
} from "@/core/ticket-design";
import { ArtworkPlacer } from "./ArtworkPlacer";

/* The template editor's fields and its live preview. The preview uses the same renderer as the
   Events site (core/ticket-design.ts), so what you see here is what customers get.

   Each format (e-ticket, printed ticket) is either generated from the settings below or uses a
   design made in Canva: upload the export, then drag the QR and details into place. */
const COLOURS: { key: "bg" | "bg2" | "ink" | "accent"; label: string }[] = [
  { key: "bg", label: "Background" }, { key: "bg2", label: "Gradient to" }, { key: "ink", label: "Text" }, { key: "accent", label: "Accent" },
];
const STATES: { key: NonNullable<TicketData["status"]>; label: string }[] = [
  { key: "VALID", label: "Valid" }, { key: "USED", label: "Checked in" }, { key: "REFUND_REQUESTED", label: "Refund pending" }, { key: "REFUNDED", label: "Refunded" },
];
const KINDS: { key: ArtKind; label: string }[] = [{ key: "eticket", label: "E-ticket" }, { key: "stub", label: "Printed ticket" }];
const FONTS: { key: ArtFont; label: string }[] = [{ key: "sans", label: "Sans" }, { key: "mono", label: "Mono" }, { key: "display", label: "Display" }];
/** Stand-in id for artwork chosen in this session but not uploaded yet (sent as "new"). */
const NEW_ID = "00000000-0000-4000-8000-000000000000";
const PRINT_SAMPLE = { serial: "000457", zone: "Floor", partnerLabel: "Sold by: Halftone Records / P012" };

/** Turns a Canva export into an upload-sized JPEG (max 3000 px, white behind transparency),
    so it fits the hosting upload limit and matches what the Events site stores. */
async function prepare(file: File) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Export your Canva design as PNG or JPG (not PDF or SVG), then choose that file.");
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 3000 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, w, h); g.drawImage(bmp, 0, 0, w, h);
  let blob: Blob | null = null;
  for (const q of [0.92, 0.85, 0.75]) {
    blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", q));
    if (blob && blob.size < 3.5 * 1024 * 1024) break;
  }
  if (!blob) throw new Error("That image couldn't be read. Export it from Canva again.");
  return { file: new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }), url: URL.createObjectURL(blob), w, h };
}

export function TemplateFields({ initial, qr, qrMatrix, events, isNew }: {
  initial: TicketTemplate; qr: string; qrMatrix: boolean[][];
  events: { name: string; dateText: string; venue: string; city: string; typeName: string; priceText: string }[]; isNew: boolean;
}) {
  const [t, setT] = useState<TicketTemplate>(initial);
  const [status, setStatus] = useState<NonNullable<TicketData["status"]>>("VALID");
  const [sample, setSample] = useState(0);
  const [kind, setKind] = useState<ArtKind>("eticket");
  const [art, setArt] = useState<TicketArtwork>(initial.art);
  const [useArt, setUseArt] = useState<Record<ArtKind, boolean>>({ eticket: !!initial.art.eticket, stub: !!initial.art.stub });
  const [pending, setPending] = useState<Partial<Record<ArtKind, { url: string; name: string; warn: string }>>>({});
  const [problem, setProblem] = useState("");
  const [sel, setSel] = useState<"qr" | ArtTextKey | null>("qr");
  const fileInputs = { eticket: useRef<HTMLInputElement>(null), stub: useRef<HTMLInputElement>(null) };
  const picker = useRef<HTMLInputElement>(null);

  const set = <K extends keyof TicketTemplate>(k: K, v: TicketTemplate[K]) => setT((x) => ({ ...x, [k]: v }));
  const setField = (k: keyof TicketFields, v: boolean) => setT((x) => ({ ...x, fields: { ...x.fields, [k]: v } }));
  const setSide = (k: ArtKind, s: ArtSide | null) => setArt((a) => ({ ...a, [k]: s ? normalizeArt({ [k]: s })[k] : null }));
  useEffect(() => () => Object.values(pending).forEach((p) => p && URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const data: TicketData = { ...SAMPLE_DATA, ...(events[sample] ? { ...events[sample], doorsText: SAMPLE_DATA.doorsText } : {}), status, zone: PRINT_SAMPLE.zone };
  const href = (k: ArtKind) => (id: string) => (id === NEW_ID ? pending[k]?.url ?? null : `/files/events/${id}`);
  const side = useArt[kind] ? art[kind] : null;

  const svg = useMemo(() => {
    const q = status === "REFUNDED" ? null : qr;
    if (kind === "eticket") {
      if (side) return artTicketSvg(side, data, q, href("eticket")(side.uploadId) ?? "", `Preview of ${t.name}`);
      return ticketSvg({ ...t, art: { eticket: null, stub: null } }, data, q, { title: `Preview of ${t.name}` });
    }
    const tpl = { ...t, art: { eticket: null, stub: side } };
    return printTicketSvg(tpl, { ...data, ...PRINT_SAMPLE, status: "VALID" }, qrMatrix, { format: "stub", seed: "preview", art: side ? href("stub") : undefined });
  }, [t, data.eventName, status, qr, kind, side, pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const worst = Math.min(contrast(t.ink, t.bg), contrast(t.ink, t.bg2));
  const accentC = Math.min(contrast(t.accent, t.bg), contrast(t.accent, t.bg2));

  async function choose(f: File | undefined) {
    setProblem("");
    if (!f) return;
    try {
      const p = await prepare(f);
      const dt = new DataTransfer();
      dt.items.add(p.file);
      fileInputs[kind].current!.files = dt.files;
      const ratio = p.w / p.h;
      const warn = kind === "stub"
        ? (Math.abs(ratio - 1725 / 675) > 0.25 && Math.abs(ratio - 396 / 144) > 0.25 ? "This isn't ticket-shaped, so the edges will be cropped. Use 5.75 × 2.25 in in Canva." : p.w < 1500 ? "This is low resolution and may print soft. Export from Canva at 300 dpi." : "")
        : p.w < 700 ? "This is quite small and may look blurry on phones. Export at 1080 px wide or more." : "";
      if (pending[kind]) URL.revokeObjectURL(pending[kind]!.url);
      setPending((x) => ({ ...x, [kind]: { url: p.url, name: f.name, warn } }));
      const prev = art[kind];
      setSide(kind, prev ? { ...prev, uploadId: NEW_ID, w: p.w, h: p.h } : defaultArtSide(kind, NEW_ID, p.w, p.h));
      setUseArt((u) => ({ ...u, [kind]: true }));
      setSel("qr");
    } catch (e) { setProblem((e as Error).message); }
  }

  const artJson = JSON.stringify(Object.fromEntries(KINDS.map(({ key }) => {
    const s = useArt[key] ? art[key] : null;
    return [key, s ? { ...s, uploadId: s.uploadId === NEW_ID ? "new" : s.uploadId } : null];
  })));
  const values = artSampleValues({ ...data, ...PRINT_SAMPLE });
  const overlaps = side ? artOverlaps(side, kind, values) : [];
  const selItem = side && sel && sel !== "qr" ? side.text[sel] : null;
  const setItem = (k: ArtTextKey, patch: Partial<ArtSide["text"][ArtTextKey]>) => side && setSide(kind, { ...side, text: { ...side.text, [k]: { ...side.text[k], ...patch } } });

  return (
    <div className="tpl-editor">
      <input type="hidden" name="art" value={artJson} />
      <input type="file" name="artEticket" ref={fileInputs.eticket} hidden tabIndex={-1} aria-hidden="true" />
      <input type="file" name="artStub" ref={fileInputs.stub} hidden tabIndex={-1} aria-hidden="true" />
      <input type="file" ref={picker} hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />

      <div className="tpl-preview">
        <div className="seg" role="tablist" aria-label="Ticket format">
          {KINDS.map((k) => <button key={k.key} type="button" role="tab" aria-selected={kind === k.key} className={kind === k.key ? "on" : ""} onClick={() => { setKind(k.key); setSel("qr"); }}>{k.label}{useArt[k.key] ? " · Canva" : ""}</button>)}
        </div>
        <div className="seg seg-sm" role="radiogroup" aria-label={`${kind === "eticket" ? "E-ticket" : "Printed ticket"} design`}>
          <button type="button" role="radio" aria-checked={!useArt[kind]} className={!useArt[kind] ? "on" : ""} onClick={() => setUseArt((u) => ({ ...u, [kind]: false }))}>Generate from this template</button>
          <button type="button" role="radio" aria-checked={useArt[kind]} className={useArt[kind] ? "on" : ""} onClick={() => { setUseArt((u) => ({ ...u, [kind]: true })); if (!art[kind]) picker.current?.click(); }}>Use my Canva design</button>
        </div>

        {useArt[kind] && !art[kind] ? (
          <button type="button" className="art-drop" onClick={() => picker.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files[0]); }}>
            <b>Upload your Canva design</b>
            <span className="small dim">PNG or JPG · {ART_SIZES[kind].label}</span>
          </button>
        ) : side ? (
          <div className="tpl-stage">
            <ArtworkPlacer kind={kind} side={side} values={values} onChange={(s) => setSide(kind, s)} selected={sel} onSelect={setSel}>
              <div className="art-svg" dangerouslySetInnerHTML={{ __html: svg }} />
            </ArtworkPlacer>
          </div>
        ) : (
          <div className="tpl-stage" dangerouslySetInnerHTML={{ __html: svg }} />
        )}
        {problem && <p className="small tpl-warn" role="alert">{problem}</p>}
        {overlaps.length > 0 && <p className="small tpl-warn" role="status">{overlaps.map((k) => ART_TEXT[kind].find((x) => x.key === k)?.label).join(", ")} {overlaps.length > 1 ? "are" : "is"} under the QR and will be hidden. Drag {overlaps.length > 1 ? "them" : "it"} clear.</p>}
        {useArt[kind] && pending[kind]?.warn && <p className="small tpl-warn" role="status">{pending[kind]!.warn}</p>}

        <div className="row small">
          {kind === "eticket" && (
            <label className="row">Preview as
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Preview ticket state">
                {STATES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          )}
          {events.length > 0 && (
            <label className="row">with
              <select value={sample} onChange={(e) => setSample(Number(e.target.value))} aria-label="Preview with event">
                {events.map((e, i) => <option key={i} value={i}>{e.name}</option>)}
              </select>
            </label>
          )}
        </div>
        {side ? (
          <p className="small dim">Drag the QR and each detail into place (or select one and use the arrow keys; Shift moves further). The QR always sits on a white panel so it scans at the door.</p>
        ) : (
          <>
            <p className={`small ${worst < 4.5 ? "tpl-warn" : "dim"}`} role="status">
              Text contrast {worst.toFixed(1)}:1{worst < 3 ? " · too low to save" : worst < 4.5 ? " · hard to read in low light, aim for 4.5:1" : " · good"}
              {accentC < 3 && " · the accent colour is faint on this background"}
            </p>
            <p className="small dim">{kind === "stub" ? "Printed stub 2 × 5.5 in. Thermal tickets are always generated (black only)." : "The QR always sits on a white panel, so every design scans at the door."}</p>
          </>
        )}
      </div>

      <div className="tpl-fields">
        <label className="f">Template name<input type="text" name="name" value={t.name} onChange={(e) => set("name", e.target.value)} required maxLength={60} /></label>
        {useArt[kind] && (
          <section className="art-panel" aria-label="Canva design">
            <ol className="art-steps small">
              <li>In Canva, choose <b>Create a design → Custom size</b> and enter <b>{ART_SIZES[kind].label}</b>. <a href="https://www.canva.com/" target="_blank" rel="noopener noreferrer">Open Canva ↗</a><br /><span className="dim">{ART_SIZES[kind].note}</span></li>
              <li>Leave a clear area for the QR code (at least {kind === "stub" ? "0.75 in square" : "a third of the width"}). Names, codes and serial numbers are added here, so don&apos;t type them in Canva.</li>
              <li><b>Share → Download</b> as PNG or JPG, then upload it here.</li>
            </ol>
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={() => picker.current?.click()}>{art[kind] ? "Replace design" : "Upload design"}</button>
              {pending[kind] && <span className="small dim">{pending[kind]!.name} (saved when you save the template)</span>}
              {art[kind] && <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setSide(kind, null); setUseArt((u) => ({ ...u, [kind]: false })); fileInputs[kind].current!.value = ""; }}>Remove</button>}
            </div>
            {side && (
              <>
                <label className="f">QR size ({Math.round(side.qr.size * 100)}% of the {side.w >= side.h ? "height" : "width"})
                  <input type="range" min={ART_QR_MIN[kind]} max={0.95} step={0.01} value={side.qr.size} onChange={(e) => setSide(kind, { ...side, qr: { ...side.qr, size: Number(e.target.value) } })} />
                </label>
                <fieldset className="tpl-check">
                  <legend className="small">Details printed on your design</legend>
                  {ART_TEXT[kind].map(({ key, label }) => (
                    <label key={key} className="row small">
                      <input type="checkbox" checked={side.text[key].on} disabled={key === "code"} onChange={(e) => { setItem(key, { on: e.target.checked }); if (e.target.checked) setSel(key); }} />
                      <button type="button" className="linklike" onClick={() => setSel(key)} aria-pressed={sel === key}>{label}</button>
                    </label>
                  ))}
                </fieldset>
                {selItem && sel && sel !== "qr" && (
                  <div className="form-grid art-item" aria-label={`Style for ${ART_TEXT[kind].find((x) => x.key === sel)?.label}`}>
                    <p className="small full"><b>{ART_TEXT[kind].find((x) => x.key === sel)?.label}</b>{sel === "code" ? " (always shown: door staff type it if a QR won't scan)" : ""}</p>
                    <label className="f">Size<input type="range" min={0.012} max={0.15} step={0.002} value={selItem.size} onChange={(e) => setItem(sel, { size: Number(e.target.value) })} /></label>
                    <label className="f tpl-colour">Colour
                      <span className="row" style={{ flexWrap: "nowrap" }}>
                        <input type="color" value={selItem.color} onChange={(e) => setItem(sel, { color: e.target.value.toUpperCase() })} aria-label="Text colour picker" />
                        <input type="text" value={selItem.color} onChange={(e) => setItem(sel, { color: e.target.value })} pattern="#[0-9A-Fa-f]{6}" maxLength={7} aria-label="Text colour (hex)" />
                      </span>
                    </label>
                    <label className="f">Font
                      <select value={selItem.font} onChange={(e) => setItem(sel, { font: e.target.value as ArtFont })}>{FONTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select>
                    </label>
                    <label className="f">Align
                      <select value={selItem.align} onChange={(e) => setItem(sel, { align: e.target.value as "start" | "middle" | "end" })}>
                        <option value="start">Left</option><option value="middle">Centre</option><option value="end">Right</option>
                      </select>
                    </label>
                  </div>
                )}
                {kind === "stub" && (
                  <label className="row small"><input type="checkbox" checked={side.microtext !== false} onChange={(e) => setSide(kind, { ...side, microtext: e.target.checked })} /> Microtext line along the bottom edge (anti-copy)</label>
                )}
              </>
            )}
          </section>
        )}

        <section className="tpl-gen" aria-label="Generated design">
          <p className="small"><b>Generated design</b> <span className="dim">· used for {[!useArt.eticket && "e-tickets", !useArt.stub && "printed tickets", "thermal tickets"].filter(Boolean).join(", ")}</span></p>
          {isNew && (
            <div className="tpl-presets" role="group" aria-label="Start from a preset">
              {PRESETS.map((p) => (
                <button key={p.key} type="button" className="chip" onClick={() => setT((x) => ({ ...p.design, name: x.name, art: x.art }))}
                  style={{ background: `linear-gradient(135deg, ${p.design.bg}, ${p.design.bg2})`, color: p.design.ink, borderColor: p.design.accent }}>{p.label}</button>
              ))}
            </div>
          )}
          <div className="form-grid">
            <label className="f">Layout
              <select name="layout" value={t.layout} onChange={(e) => set("layout", e.target.value as TicketTemplate["layout"])}>
                {LAYOUTS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
              </select>
            </label>
            {COLOURS.map((c) => (
              <label key={c.key} className="f tpl-colour">{c.label}
                <span className="row" style={{ flexWrap: "nowrap" }}>
                  <input type="color" value={t[c.key]} onChange={(e) => set(c.key, e.target.value.toUpperCase())} aria-label={`${c.label} colour picker`} />
                  <input type="text" name={c.key} value={t[c.key]} onChange={(e) => set(c.key, e.target.value)} pattern="#[0-9A-Fa-f]{6}" maxLength={7} aria-label={`${c.label} colour (hex)`} />
                </span>
              </label>
            ))}
            <label className="f">Pattern
              <select name="pattern" value={t.pattern} onChange={(e) => set("pattern", e.target.value as TicketTemplate["pattern"])} disabled={t.layout === "minimal"}>
                {PATTERNS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              {t.layout === "minimal" && <input type="hidden" name="pattern" value={t.pattern} />}
            </label>
            <label className="f">Wordmark<input type="text" name="brand" value={t.brand} onChange={(e) => set("brand", e.target.value)} maxLength={30} /></label>
            <label className="f full">Headline (optional, replaces the event name)<input type="text" name="headline" value={t.headline} onChange={(e) => set("headline", e.target.value)} maxLength={80} placeholder="Event name" /></label>
            <label className="f full">Fine print<textarea name="finePrint" rows={2} value={t.finePrint} onChange={(e) => set("finePrint", e.target.value)} maxLength={300} /></label>
          </div>
          <fieldset className="tpl-check">
            <legend className="small">Show on the ticket</legend>
            {(Object.keys(FIELD_LABELS) as (keyof TicketFields)[]).map((k) => (
              <label key={k} className="row small"><input type="checkbox" name={`fields[${k}]`} checked={t.fields[k]} onChange={(e) => setField(k, e.target.checked)} /> {FIELD_LABELS[k]}</label>
            ))}
          </fieldset>
        </section>
      </div>
    </div>
  );
}
