import { FONT_SOURCE } from "@/lib/delta-corps-priest";

export const FONT_HEIGHT = 9;

export type Glyph = {
  rows: string[];
  width: number;
};

export type FigletFont = {
  height: number;
  glyphs: Record<number, Glyph>;
};

function rtrim(s: string): string {
  return s.replace(/ +$/, "");
}

function ltrim(s: string): string {
  return s.replace(/^ +/, "");
}

export function parseFiglet(source: string): FigletFont {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const header = lines[0]?.split(" ") ?? [];
  const height = Number(header[1]);
  const commentLines = Number(header[5]);
  if (!height || Number.isNaN(commentLines)) {
    throw new Error("Could not read the embedded font.");
  }

  const hardblank = header[0]?.slice(-1) ?? "$";
  const glyphs: Record<number, Glyph> = {};
  let cursor = 1 + commentLines;
  let endmark = "";

  for (let code = 32; code <= 126; code++) {
    const rows: string[] = [];
    let width = 0;
    for (let r = 0; r < height; r++) {
      let line = lines[cursor++] ?? "";
      if (!endmark && line.length > 0) {
        endmark = line[line.length - 1] ?? "@";
      }
      while (line.length > 0 && line[line.length - 1] === endmark) {
        line = line.slice(0, -1);
      }
      line = line.split(hardblank).join(" ");
      rows.push(line);
      if (line.length > width) width = line.length;
    }
    glyphs[code] = { rows, width };
  }

  return { height, glyphs };
}

export const FONT: FigletFont = parseFiglet(FONT_SOURCE);

export function printableAscii(): string {
  let out = "";
  for (let code = 32; code <= 126; code++) out += String.fromCharCode(code);
  return out;
}

export function hasGlyph(ch: string, font: FigletFont = FONT): boolean {
  const code = ch.codePointAt(0);
  if (code === undefined) return false;
  return (font.glyphs[code]?.width ?? 0) > 0;
}

export function missingGlyphs(
  text: string,
  font: FigletFont = FONT,
): string[] {
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const ch of text) {
    if (ch === "\n") continue;
    if (!hasGlyph(ch, font) && !seen.has(ch)) {
      seen.add(ch);
      missing.push(ch);
    }
  }
  return missing;
}

function padRow(row: string, width: number): string {
  return row.length >= width ? row : row + " ".repeat(width - row.length);
}

/** Lay glyphs beside each other with Omarchy-style kerning. */
export function renderFiglet(
  text: string,
  font: FigletFont = FONT,
): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const source of lines) {
    out.push(...drawLine(source, font));
  }
  return out;
}

function drawLine(source: string, font: FigletFont): string[] {
  const { height, glyphs } = font;
  const out: string[] = Array.from({ length: height }, () => "");
  const trail: number[] = Array.from({ length: height }, () => 0);
  let drew = false;

  for (const ch of source) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    const glyph = glyphs[code];
    if (!glyph || glyph.width === 0) continue;

    const piece = glyph.rows.map((row) => padRow(row, glyph.width));

    if (!drew) {
      for (let r = 0; r < height; r++) {
        out[r] = rtrim(piece[r] ?? "");
        trail[r] = glyph.width - out[r].length;
      }
      drew = true;
      continue;
    }

    let amount = Number.POSITIVE_INFINITY;
    for (let r = 0; r < height; r++) {
      const lead = glyph.width - ltrim(piece[r] ?? "").length;
      amount = Math.min(amount, (trail[r] ?? 0) + lead);
    }
    if (!Number.isFinite(amount)) amount = 0;

    for (let r = 0; r < height; r++) {
      const cut = Math.min(amount, trail[r] ?? 0);
      const keep = amount - cut;
      const remaining = (trail[r] ?? 0) - cut;
      const fragment = (piece[r] ?? "").slice(keep);
      const body = rtrim(fragment);
      if (body === "") {
        trail[r] = remaining + fragment.length;
      } else {
        const pad = remaining > 0 ? " ".repeat(remaining) : "";
        out[r] = (out[r] ?? "") + pad + body;
        trail[r] = fragment.length - body.length;
      }
    }
  }

  return out.map((row) => rtrim(row));
}

export function figletWidth(rows: string[]): number {
  return rows.reduce((max, row) => Math.max(max, row.length), 0);
}
