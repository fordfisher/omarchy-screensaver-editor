"use client";

import { useMemo, useRef, type PointerEvent } from "react";

import { getCell, type AsciiDoc } from "@/lib/document";

import type { Cell, Marquee, TypeSession } from "@/components/studio/types";

type Props = {
  doc: AsciiDoc;
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  ink: string;
  paper: string;
  hover: Cell | null;
  marquee: Marquee | null;
  typeSession: TypeSession | null;
  cursor: string;
  onHover: (cell: Cell | null) => void;
  onCellDown: (cell: Cell, event: PointerEvent<HTMLDivElement>) => void;
  onCellMove: (cell: Cell, event: PointerEvent<HTMLDivElement>) => void;
  onCellUp: (cell: Cell, event: PointerEvent<HTMLDivElement>) => void;
  onPan: (next: { x: number; y: number }) => void;
  onZoom: (next: number, around: { x: number; y: number }) => void;
};

function cellSize(zoom: number) {
  const height = zoom;
  const width = Math.max(6, Math.round(zoom * 0.62));
  return { width, height };
}

function hit(
  event: { clientX: number; clientY: number },
  wrap: HTMLDivElement,
  doc: AsciiDoc,
  pan: { x: number; y: number },
  zoom: number,
): Cell | null {
  const rect = wrap.getBoundingClientRect();
  const { width, height } = cellSize(zoom);
  const x = Math.floor((event.clientX - rect.left - pan.x) / width);
  const y = Math.floor((event.clientY - rect.top - pan.y) / height);
  if (x < 0 || y < 0 || x >= doc.cols || y >= doc.rows) return null;
  return { x, y };
}

/** Paint Omarchy block glyphs as geometry so they show even if the UI font lacks them. */
function Glyph({ ch }: { ch: string }) {
  if (ch === " " || ch === "") return null;
  if (ch === "█") return <span className="absolute inset-0 bg-current" />;
  if (ch === "▀") return <span className="absolute inset-x-0 top-0 h-1/2 bg-current" />;
  if (ch === "▄") return <span className="absolute inset-x-0 bottom-0 h-1/2 bg-current" />;
  if (ch === "▌") return <span className="absolute inset-y-0 left-0 w-1/2 bg-current" />;
  if (ch === "▐") return <span className="absolute inset-y-0 right-0 w-1/2 bg-current" />;
  if (ch === "░") return <span className="absolute inset-0 bg-current opacity-25" />;
  if (ch === "▒") return <span className="absolute inset-0 bg-current opacity-50" />;
  if (ch === "▓") return <span className="absolute inset-0 bg-current opacity-75" />;
  return <span className="relative leading-none">{ch}</span>;
}

export function AsciiCanvas({
  doc,
  zoom,
  pan,
  showGrid,
  ink,
  paper,
  hover,
  marquee,
  typeSession,
  cursor,
  onHover,
  onCellDown,
  onCellMove,
  onCellUp,
  onPan,
  onZoom,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { width: cw, height: ch } = cellSize(zoom);

  const cells = useMemo(() => {
    const out: string[] = [];
    for (let y = 0; y < doc.rows; y++) {
      for (let x = 0; x < doc.cols; x++) {
        out.push(getCell(doc, x, y));
      }
    }
    return out;
  }, [doc]);

  const handle = (
    event: PointerEvent<HTMLDivElement>,
    fn: (cell: Cell, event: PointerEvent<HTMLDivElement>) => void,
    requireCell: boolean,
  ) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cell = hit(event, wrap, doc, pan, zoom);
    if (cell) fn(cell, event);
    else if (!requireCell) fn({ x: 0, y: 0 }, event);
  };

  return (
    <div
      ref={wrapRef}
      className="relative min-h-0 w-full flex-1 overflow-hidden"
      style={{ cursor, background: "#0b0d10" }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        if (event.button === 1 || event.buttons === 4) {
          event.preventDefault();
          return;
        }
        handle(event, onCellDown, true);
      }}
      onPointerMove={(event) => {
        if (event.buttons === 4 || event.buttons === 2 || (event.buttons === 1 && cursor === "grab")) {
          onPan({ x: pan.x + event.movementX, y: pan.y + event.movementY });
          return;
        }
        const wrap = wrapRef.current;
        if (!wrap) return;
        const cell = hit(event, wrap, doc, pan, zoom);
        onHover(cell);
        if (event.buttons === 1 && cell) onCellMove(cell, event);
      }}
      onPointerUp={(event) => handle(event, onCellUp, false)}
      onPointerLeave={() => onHover(null)}
      onWheel={(event) => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
        const next = Math.min(48, Math.max(8, zoom * factor));
        onZoom(next, {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }}
    >
      <div
        data-testid="ascii-paper"
        className="absolute font-mono select-none"
        style={{
          left: pan.x,
          top: pan.y,
          display: "grid",
          gridTemplateColumns: `repeat(${doc.cols}, ${cw}px)`,
          gridTemplateRows: `repeat(${doc.rows}, ${ch}px)`,
          width: doc.cols * cw,
          height: doc.rows * ch,
          backgroundColor: paper,
          backgroundImage: showGrid
            ? "linear-gradient(rgba(186, 200, 224, 0.38) 1px, transparent 1px), linear-gradient(90deg, rgba(186, 200, 224, 0.38) 1px, transparent 1px)"
            : undefined,
          backgroundSize: `${cw}px ${ch}px`,
          color: ink,
          fontSize: Math.max(8, Math.floor(ch * 0.9)),
          fontFamily:
            "var(--font-noto-mono), var(--font-geist-mono), ui-monospace, monospace",
          boxShadow: "0 0 0 1px rgba(186, 200, 224, 0.42)",
        }}
      >
        {cells.map((glyph, i) => (
          <span
            key={i}
            className="relative flex items-center justify-center overflow-hidden"
          >
            <Glyph ch={glyph} />
          </span>
        ))}
      </div>

      {hover ? (
        <div
          className="pointer-events-none absolute z-10 ring-1 ring-emerald-300/90"
          style={{
            left: pan.x + hover.x * cw,
            top: pan.y + hover.y * ch,
            width: cw,
            height: ch,
          }}
        />
      ) : null}

      {marquee ? (
        <div
          className="pointer-events-none absolute z-10 bg-sky-400/15 ring-1 ring-sky-300"
          style={{
            left: pan.x + Math.min(marquee.x0, marquee.x1) * cw,
            top: pan.y + Math.min(marquee.y0, marquee.y1) * ch,
            width: (Math.abs(marquee.x1 - marquee.x0) + 1) * cw,
            height: (Math.abs(marquee.y1 - marquee.y0) + 1) * ch,
          }}
        />
      ) : null}

      {typeSession ? (
        <div
          className="pointer-events-none absolute z-10 w-0.5 animate-pulse bg-emerald-300"
          style={{
            left: pan.x + typeSession.x * cw,
            top: pan.y + typeSession.y * ch,
            height: ch,
          }}
        />
      ) : null}
    </div>
  );
}

export { cellSize };
