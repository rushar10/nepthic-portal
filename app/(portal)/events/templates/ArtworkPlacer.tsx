"use client";
import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { ART_QR_MIN, ART_TEXT, artTextBox, type ArtKind, type ArtSide, type ArtTextKey } from "@/core/ticket-design";

/* Drag-to-place layer over an artwork preview. The SVG underneath is the real renderer's output;
   this layer only draws outlines and handles at the same positions, and turns drags (or arrow
   keys, for keyboard users) into new fractional positions. */

type Sel = "qr" | ArtTextKey;
const SPACE: Record<ArtKind, (s: ArtSide) => { W: number; H: number }> = {
  eticket: (s) => ({ W: 1000, H: (1000 * s.h) / s.w }),
  stub: () => ({ W: 396, H: 144 }),
};

export function ArtworkPlacer({ kind, side, values, onChange, selected, onSelect, children }: {
  kind: ArtKind; side: ArtSide; values: Record<ArtTextKey, string>; onChange: (s: ArtSide) => void; selected: Sel | null; onSelect: (s: Sel) => void; children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ key: Sel; dx: number; dy: number } | null>(null);
  const { W, H } = SPACE[kind](side);
  const min = Math.min(W, H);
  const qw = (side.qr.size * min) / W, qh = (side.qr.size * min) / H;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const move = (key: Sel, x: number, y: number) => {
    if (key === "qr") onChange({ ...side, qr: { ...side.qr, x: clamp(x, 0, 1 - qw), y: clamp(y, 0, 1 - qh) } });
    else onChange({ ...side, text: { ...side.text, [key]: { ...side.text[key], x: clamp(x, 0, 1), y: clamp(y, 0, 1) } } });
  };
  const at = (e: PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const down = (key: Sel) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = at(e);
    const o = key === "qr" ? side.qr : side.text[key];
    drag.current = { key, dx: p.x - o.x, dy: p.y - o.y };
    onSelect(key);
  };
  const moving = (e: PointerEvent) => {
    if (!drag.current) return;
    const p = at(e);
    move(drag.current.key, p.x - drag.current.dx, p.y - drag.current.dy);
  };
  const up = () => { drag.current = null; };
  const nudge = (key: Sel) => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.02 : 0.004;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const o = key === "qr" ? side.qr : side.text[key];
    move(key, o.x + d[0], o.y + d[1]);
  };
  const labels = Object.fromEntries(ART_TEXT[kind].map((t) => [t.key, t.label]));

  return (
    <div className="art-place" ref={box} onPointerMove={moving} onPointerUp={up} onPointerCancel={up} style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, ${Math.round((560 * W) / H)}px)` }}>
      {children}
      <button type="button" className={`art-h art-qr${selected === "qr" ? " on" : ""}`} aria-label={`QR code position. Drag, or use arrow keys. Minimum size ${Math.round(ART_QR_MIN[kind] * 100)}%.`}
        style={{ left: `${side.qr.x * 100}%`, top: `${side.qr.y * 100}%`, width: `${qw * 100}%`, height: `${qh * 100}%` }}
        onPointerDown={down("qr")} onKeyDown={nudge("qr")} onFocus={() => onSelect("qr")}><span>QR</span></button>
      {ART_TEXT[kind].filter((t) => side.text[t.key].on && values[t.key]).map(({ key }) => {
        // An outline the size of the text itself, so the preview stays readable; the name shows on the selected one.
        const b = artTextBox(side, kind, key, values[key]);
        return (
          <button key={key} type="button" title={labels[key]} className={`art-h art-t${selected === key ? " on" : ""}`} aria-label={`${labels[key]} position. Drag, or use arrow keys.`}
            style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}
            onPointerDown={down(key)} onKeyDown={nudge(key)} onFocus={() => onSelect(key)}>{selected === key && <span>{labels[key]}</span>}</button>
        );
      })}
    </div>
  );
}
