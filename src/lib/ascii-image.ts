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

export type PixelBuffer = {
  width: number;
  height: number;
  data: ArrayLike<number>;
};

export function imageDataToLines(
  image: PixelBuffer,
  ramp: string,
  invert = false,
): string[] {
  const { width, height, data } = image;
  const lines: string[] = [];
  for (let y = 0; y < height; y++) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const t = luminance(
        data[i] ?? 0,
        data[i + 1] ?? 0,
        data[i + 2] ?? 0,
        data[i + 3] ?? 255,
      );
      line += grayToChar(t, ramp, invert);
    }
    lines.push(line.replace(/ +$/, ""));
  }
  while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}
