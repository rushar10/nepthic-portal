"use client";
import { useMemo, useState } from "react";
import {
  contrast, FIELD_LABELS, LAYOUTS, PATTERNS, PRESETS, SAMPLE_DATA, ticketSvg, type TicketData, type TicketFields, type TicketTemplate,
} from "@/core/ticket-design";

/* The template editor's fields and its live preview. The preview uses the same renderer as the
   Events site (core/ticket-design.ts), so what you see here is what customers get. */
const COLOURS: { key: "bg" | "bg2" | "ink" | "accent"; label: string }[] = [
  { key: "bg", label: "Background" }, { key: "bg2", label: "Gradient to" }, { key: "ink", label: "Text" }, { key: "accent", label: "Accent" },
];
const STATES: { key: NonNullable<TicketData["status"]>; label: string }[] = [
  { key: "VALID", label: "Valid" }, { key: "USED", label: "Checked in" }, { key: "REFUND_REQUESTED", label: "Refund pending" }, { key: "REFUNDED", label: "Refunded" },
];

export function TemplateFields({ initial, qr, events, isNew }: { initial: TicketTemplate; qr: string; events: { name: string; dateText: string; venue: string; city: string; typeName: string; priceText: string }[]; isNew: boolean }) {
  const [t, setT] = useState<TicketTemplate>(initial);
  const [status, setStatus] = useState<NonNullable<TicketData["status"]>>("VALID");
  const [sample, setSample] = useState(0);
  const set = <K extends keyof TicketTemplate>(k: K, v: TicketTemplate[K]) => setT((x) => ({ ...x, [k]: v }));
  const setField = (k: keyof TicketFields, v: boolean) => setT((x) => ({ ...x, fields: { ...x.fields, [k]: v } }));
  const data: TicketData = { ...SAMPLE_DATA, ...(events[sample] ? { ...events[sample], doorsText: SAMPLE_DATA.doorsText } : {}), status };
  const svg = useMemo(() => ticketSvg(t, data, status === "REFUNDED" ? null : qr, { title: `Preview of ${t.name}` }), [t, data.eventName, status, qr]); // eslint-disable-line react-hooks/exhaustive-deps
  const worst = Math.min(contrast(t.ink, t.bg), contrast(t.ink, t.bg2));
  const accentC = Math.min(contrast(t.accent, t.bg), contrast(t.accent, t.bg2));

  return (
    <div className="tpl-editor">
      <div className="tpl-preview">
        <div className="tpl-stage" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="row small">
          <label className="row">Preview as
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Preview ticket state">
              {STATES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          {events.length > 0 && (
            <label className="row">with
              <select value={sample} onChange={(e) => setSample(Number(e.target.value))} aria-label="Preview with event">
                {events.map((e, i) => <option key={i} value={i}>{e.name}</option>)}
              </select>
            </label>
          )}
        </div>
        <p className={`small ${worst < 4.5 ? "tpl-warn" : "dim"}`} role="status">
          Text contrast {worst.toFixed(1)}:1{worst < 3 ? " · too low to save" : worst < 4.5 ? " · hard to read in low light, aim for 4.5:1" : " · good"}
          {accentC < 3 && " · the accent colour is faint on this background"}
        </p>
        <p className="small dim">The QR always sits on a white panel, so every design scans at the door.</p>
      </div>

      <div className="tpl-fields">
        {isNew && (
          <div className="tpl-presets" role="group" aria-label="Start from a preset">
            {PRESETS.map((p) => (
              <button key={p.key} type="button" className="chip" onClick={() => setT((x) => ({ ...p.design, name: x.name }))}
                style={{ background: `linear-gradient(135deg, ${p.design.bg}, ${p.design.bg2})`, color: p.design.ink, borderColor: p.design.accent }}>{p.label}</button>
            ))}
          </div>
        )}
        <div className="form-grid">
          <label className="f">Template name<input type="text" name="name" value={t.name} onChange={(e) => set("name", e.target.value)} required maxLength={60} /></label>
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
      </div>
    </div>
  );
}
