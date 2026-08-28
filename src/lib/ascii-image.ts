/** Every printable ASCII character, ordered roughly dark → light for a black canvas. */
export const FULL_ASCII_RAMP =
  "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

/** The three glyphs Omarchy's `transcode ascii --mode block` uses, plus space. */
export const OMARCHY_THREE = "█▀▄ ";

export const BLOCK_RAMP = "█▓▒░ ";

const REMAINING_PRINTABLE = (() => {
  const used = new Set(Array.from(FULL_ASCII_RAMP));
  let extra = "";
  for (let code = 32; code <= 126; code++) {
    const ch = String.fromCharCode(code);
    if (!used.has(ch)) extra += ch;
  }
  return extra;
})();

/** Full printable ASCII 32–126: classic density ramp plus every leftover glyph. */
export const ALL_PRINTABLE_RAMP =
  FULL_ASCII_RAMP.slice(0, -8) + REMAINING_PRINTABLE + FULL_ASCII_RAMP.slice(-8);

export const RAMPS = {
  full: ALL_PRINTABLE_RAMP,
  omarchy3: OMARCHY_THREE,
  blocks: BLOCK_RAMP,
} as const;

export type RampName = keyof typeof RAMPS;

export function uniqueChars(s: string): string {
  return Array.from(new Set(Array.from(s))).join("");
}

export function rampCoversPrintableAscii(ramp: string): boolean {
  const set = new Set(Array.from(ramp));
  for (let code = 32; code <= 126; code++) {
    if (!set.has(String.fromCharCode(code))) return false;
  }
  return true;
}

export function luminance(r: number, g: number, b: number, a = 255): number {
  const alpha = a / 255;
  const lin = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lin * alpha;
}

/** Rec. 709 luminance as a 0–100 grayscale percent. */
export function luminancePercent(
  r: number,
  g: number,
  b: number,
  a = 255,
): number {
  return Math.min(100, Math.max(0, Math.round(luminance(r, g, b, a) * 100)));
}

export type GrayConvertOptions = {
  ramp: string;
  invert?: boolean;
  /** Grayscale percent treated as solid black (densest glyph). Default 0. */
  black?: number;
  /** Grayscale percent treated as solid white (empty). Default 100. */
  white?: number;
};

/**
 * Stretch a 0–100 grayscale percent into 0–1 using black/white points.
 * Pixels at or below `black` become 0; at or above `white` become 1.
 */
export function mapGrayPercent(
  percent: number,
  black = 0,
  white = 100,
  invert = false,
): number {
  const lo = Math.min(black, white);
  const hi = Math.max(black, white);
  const span = hi - lo;
  let t =
    span < 0.0001
      ? percent >= hi
        ? 1
        : 0
      : (percent - lo) / span;
  t = Math.min(1, Math.max(0, t));
  if (white < black) t = 1 - t;
  if (invert) t = 1 - t;
  return t;
}

export function grayToChar(
  t: number,
  ramp: string,
  invert = false,
): string {
  if (ramp.length === 0) return " ";
  const v = invert ? 1 - t : t;
  const clamped = Math.min(1, Math.max(0, v));
  const i = Math.min(ramp.length - 1, Math.floor(clamped * ramp.length));
  return ramp[i] ?? " ";
}

export function grayPercentToChar(
  percent: number,
  options: GrayConvertOptions,
): string {
  const t = mapGrayPercent(
    percent,
    options.black ?? 0,
    options.white ?? 100,
    options.invert ?? false,
  );
  return grayToChar(t, options.ramp, false);
}

export type PixelBuffer = {
  width: number;
  height: number;
  data: ArrayLike<number>;
};

export function convertImageToLines(
  image: PixelBuffer,
  options: GrayConvertOptions,
): string[] {
  const { width, height, data } = image;
  const lines: string[] = [];
  for (let y = 0; y < height; y++) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const percent = luminancePercent(
        data[i] ?? 0,
        data[i + 1] ?? 0,
        data[i + 2] ?? 0,
        data[i + 3] ?? 255,
      );
      line += grayPercentToChar(percent, options);
    }
    lines.push(line.replace(/ +$/, ""));
  }
  while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Sample the ramp along grayscale 0% → 100% (default 11 ticks: 0, 10, … 100). */
export function grayScaleLegend(
  options: GrayConvertOptions,
  steps = 11,
): string {
  const n = Math.max(2, steps);
  let out = "";
  for (let i = 0; i < n; i++) {
    out += grayPercentToChar((i / (n - 1)) * 100, options);
  }
  return out;
}

export function imageDataToLines(
  image: PixelBuffer,
  ramp: string,
  invert = false,
): string[] {
  return convertImageToLines(image, { ramp, invert, black: 0, white: 100 });
}
