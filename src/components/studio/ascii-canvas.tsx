"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";

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
  onCellDown: (cell: Cell, event: PointerEvent<HTMLCanvasElement>) => void;
  onCellMove: (cell: Cell, event: PointerEvent<HTMLCanvasElement>) => void;
  onCellUp: (cell: Cell, event: PointerEvent<HTMLCanvasElement>) => void;
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
  canvas: HTMLCanvasElement,
  doc: AsciiDoc,
  pan: { x: number; y: number },
  zoom: number,
): Cell | null {
  const rect = canvas.getBoundingClientRect();
  const { width, height } = cellSize(zoom);
  const x = Math.floor((event.clientX - rect.left - pan.x) / width);
  const y = Math.floor((event.clientY - rect.top - pan.y) / height);
  if (x < 0 || y < 0 || x >= doc.cols || y >= doc.rows) return null;
  return { x, y };
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
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const caretOn = useRef(true);

  const draw = useCallback(() => {
    const canvas = ref.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = wrap.clientWidth;
    const cssH = wrap.clientHeight;
    if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0b0d10";
    ctx.fillRect(0, 0, cssW, cssH);

    const fontFamily =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-geist-mono")
        .trim() || "ui-monospace";

    const { width: cw, height: ch } = cellSize(zoom);
    ctx.save();
    ctx.translate(pan.x, pan.y);

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, doc.cols * cw, doc.rows * ch);

    ctx.font = `${Math.floor(ch * 0.92)}px ${fontFamily}, ui-monospace, monospace`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = ink;

    for (let y = 0; y < doc.rows; y++) {
      for (let x = 0; x < doc.cols; x++) {
        const chAt = getCell(doc, x, y);
        if (chAt === " ") continue;
        ctx.fillText(chAt, x * cw, y * ch + ch * 0.04);
      }
    }

    if (showGrid && zoom >= 12) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= doc.cols; x++) {
        ctx.moveTo(x * cw + 0.5, 0);
        ctx.lineTo(x * cw + 0.5, doc.rows * ch);
      }
      for (let y = 0; y <= doc.rows; y++) {
        ctx.moveTo(0, y * ch + 0.5);
        ctx.lineTo(doc.cols * cw, y * ch + 0.5);
      }
      ctx.stroke();
    }

    if (hover) {
      ctx.strokeStyle = "rgba(166, 227, 161, 0.85)";
      ctx.lineWidth = 1;
      ctx.strokeRect(hover.x * cw + 0.5, hover.y * ch + 0.5, cw - 1, ch - 1);
    }

    if (marquee) {
      const left = Math.min(marquee.x0, marquee.x1);
      const top = Math.min(marquee.y0, marquee.y1);
      const w = Math.abs(marquee.x1 - marquee.x0) + 1;
      const h = Math.abs(marquee.y1 - marquee.y0) + 1;
      ctx.fillStyle = "rgba(137, 180, 250, 0.12)";
      ctx.fillRect(left * cw, top * ch, w * cw, h * ch);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = "rgba(137, 180, 250, 0.95)";
      ctx.strokeRect(left * cw + 0.5, top * ch + 0.5, w * cw - 1, h * ch - 1);
      ctx.setLineDash([]);
    }

    if (typeSession && caretOn.current) {
      ctx.fillStyle = "#a6e3a1";
      ctx.fillRect(typeSession.x * cw, typeSession.y * ch, 2, ch);
    }

    ctx.restore();
  }, [doc, hover, ink, marquee, pan.x, pan.y, paper, showGrid, typeSession, zoom]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (!typeSession) return;
    const id = window.setInterval(() => {
      caretOn.current = !caretOn.current;
      draw();
    }, 530);
    return () => window.clearInterval(id);
  }, [draw, typeSession]);

  return (
    <div
      ref={wrapRef}
      className="relative h-full min-h-0 flex-1 overflow-hidden"
      style={{ cursor }}
    >
      <canvas
        ref={ref}
        className="absolute inset-0 h-full w-full touch-none"
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          const canvas = ref.current;
          if (!canvas) return;
          canvas.setPointerCapture(event.pointerId);
          if (event.button === 1 || event.buttons === 4) {
            event.preventDefault();
            return;
          }
          const cell = hit(event, canvas, doc, pan, zoom);
          if (cell) onCellDown(cell, event);
        }}
        onPointerMove={(event) => {
          const canvas = ref.current;
          if (!canvas) return;
          if (event.buttons === 4 || event.buttons === 2) {
            onPan({ x: pan.x + event.movementX, y: pan.y + event.movementY });
            return;
          }
          const cell = hit(event, canvas, doc, pan, zoom);
          onHover(cell);
          if (event.buttons === 1 && cell) onCellMove(cell, event);
        }}
        onPointerUp={(event) => {
          const canvas = ref.current;
          if (!canvas) return;
          const cell = hit(event, canvas, doc, pan, zoom) ?? { x: 0, y: 0 };
          onCellUp(cell, event);
        }}
        onPointerLeave={() => onHover(null)}
        onWheel={(event) => {
          event.preventDefault();
          const canvas = ref.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
          const next = Math.min(48, Math.max(8, zoom * factor));
          onZoom(next, {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }}
      />
    </div>
  );
}

export { cellSize };
