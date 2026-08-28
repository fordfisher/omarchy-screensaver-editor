"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/studio/chrome";
import {
  convertImageToLines,
  grayScaleLegend,
  RAMPS,
  type PixelBuffer,
  type RampName,
} from "@/lib/ascii-image";

type Props = {
  open: boolean;
  cols: number;
  rows: number;
  onClose: () => void;
  onStamp: (lines: string[]) => void;
};

function isJpgOrPng(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/jpeg" ||
    type === "image/png" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png")
  );
}

function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

function rasterize(
  img: HTMLImageElement,
  cols: number,
  rows: number,
): PixelBuffer {
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: cols, height: rows, data: new Uint8ClampedArray(cols * rows * 4) };
  }
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cols, rows);
  const scale = Math.min(cols / img.width, rows / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const ox = Math.floor((cols - w) / 2);
  const oy = Math.floor((rows - h) / 2);
  ctx.drawImage(img, ox, oy, w, h);
  const { data } = ctx.getImageData(0, 0, cols, rows);
  return { width: cols, height: rows, data };
}

function PercentSlider({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-mono text-xs tabular-nums text-zinc-400">
          {value}%
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-emerald-400"
      />
      <p className="text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

export function ImageConverter({ open, cols, rows, onClose, onStamp }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"empty" | "loading" | "ready" | "error">(
    "empty",
  );
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [pixels, setPixels] = useState<PixelBuffer | null>(null);
  const [rampName, setRampName] = useState<RampName>("full");
  const [black, setBlack] = useState(0);
  const [white, setWhite] = useState(100);
  const [invert, setInvert] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const options = useMemo(
    () => ({ ramp: RAMPS[rampName], black, white, invert }),
    [rampName, black, white, invert],
  );

  const legend = useMemo(() => grayScaleLegend(options), [options]);

  const lines = useMemo(() => {
    if (!pixels) return [];
    return convertImageToLines(pixels, options);
  }, [pixels, options]);

  useEffect(() => {
    if (open) return;
    setStatus("empty");
    setError("");
    setFileName("");
    setSource(null);
    setPixels(null);
    setDragOver(false);
  }, [open]);

  const ingest = async (file: File | undefined) => {
    if (!file) return;
    if (!isJpgOrPng(file)) {
      setStatus("error");
      setError("JPG or PNG only.");
      setSource(null);
      setPixels(null);
      setFileName(file.name);
      return;
    }
    setStatus("loading");
    setError("");
    setFileName(file.name);
    try {
      const img = await loadImageFile(file);
      setPixels(rasterize(img, cols, rows));
      setSource(img);
      setStatus("ready");
    } catch {
      setStatus("error");
      setError("Could not read that image. Try a JPG or PNG.");
      setSource(null);
      setPixels(null);
    }
  };

  useEffect(() => {
    if (!source) return;
    setPixels(rasterize(source, cols, rows));
  }, [source, cols, rows]);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    void ingest(event.dataTransfer.files?.[0]);
  };

  return (
    <Modal
      open={open}
      title="Convert JPG / PNG"
      description="Each pixel becomes a grayscale percent from 0% (black) to 100% (white), then a character. Stamp that onto the live canvas."
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={status !== "ready" || lines.length === 0}
            onClick={() => {
              onStamp(lines);
              onClose();
            }}
          >
            Stamp onto canvas
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="grid min-w-0 gap-3">
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={
              dragOver
                ? "rounded-lg border border-dashed border-emerald-400 bg-emerald-400/10 p-4"
                : "rounded-lg border border-dashed border-zinc-700 bg-zinc-950 p-4"
            }
          >
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="hidden"
              onChange={(event) => {
                void ingest(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <p className="text-sm text-zinc-300">
              Drop a <span className="font-medium text-zinc-100">JPG or PNG</span>{" "}
              here, or{" "}
              <button
                type="button"
                className="text-emerald-300 underline-offset-2 hover:underline"
                onClick={() => fileRef.current?.click()}
              >
                choose a file
              </button>
              .
            </p>
            {fileName ? (
              <p className="mt-2 font-mono text-xs text-zinc-500">{fileName}</p>
            ) : null}
            {status === "loading" ? (
              <p className="mt-2 text-sm text-zinc-400">Reading image…</p>
            ) : null}
            {status === "error" ? (
              <p className="mt-2 text-sm text-red-300">{error}</p>
            ) : null}
            {status === "empty" ? (
              <p className="mt-2 text-xs text-zinc-500">
                Fits to this canvas ({cols}×{rows}). Nothing is stamped until you
                confirm.
              </p>
            ) : null}
          </div>

          {status === "ready" ? (
            <pre
              data-testid="convert-preview"
              className="max-h-64 overflow-auto rounded-lg bg-black p-2 font-mono text-[10px] leading-none text-zinc-200"
            >
              {lines.join("\n") || " "}
            </pre>
          ) : (
            <div className="flex max-h-64 min-h-32 items-center justify-center rounded-lg bg-black p-4 text-sm text-zinc-500">
              Preview lands here after you pick an image.
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Grayscale 0–100%</Label>
            <div
              className="h-3 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #000 0%, #808080 50%, #fff 100%)",
              }}
            />
            <div className="flex justify-between font-mono text-[11px] text-zinc-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <p className="overflow-x-auto font-mono text-sm tracking-widest text-zinc-200">
              {legend}
            </p>
            <p className="text-xs text-zinc-500">
              0% is dense, 100% is empty. Those ticks are 0, 10, 20… 100.
            </p>
          </div>

          <PercentSlider
            id="gray-black"
            label="Black point"
            value={black}
            onChange={setBlack}
            hint="At or below this percent → densest glyph."
          />
          <PercentSlider
            id="gray-white"
            label="White point"
            value={white}
            onChange={setWhite}
            hint="At or above this percent → lightest glyph."
          />

          <div className="grid gap-1.5">
            <Label htmlFor="convert-ramp">Characters</Label>
            <select
              id="convert-ramp"
              className="h-8 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
              value={rampName}
              onChange={(event) =>
                setRampName(event.target.value as RampName)
              }
            >
              <option value="full">Full ASCII (all 95)</option>
              <option value="blocks">Blocks (█▓▒░)</option>
              <option value="omarchy3">Omarchy 3 (█ ▀ ▄)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={invert}
              onChange={(event) => setInvert(event.target.checked)}
            />
            Invert (light logo on dark paper)
          </label>
        </div>
      </div>
    </Modal>
  );
}
