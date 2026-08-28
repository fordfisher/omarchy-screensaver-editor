export type AsciiDoc = {
  cols: number;
  rows: number;
  cells: string[];
};

export const EMPTY = " ";

export function createDoc(
  cols: number,
  rows: number,
  fill = EMPTY,
): AsciiDoc {
  if (cols < 1 || rows < 1) {
    throw new Error("Canvas needs at least 1 column and 1 row.");
  }
  return { cols, rows, cells: Array.from({ length: cols * rows }, () => fill) };
}

export function cloneDoc(doc: AsciiDoc): AsciiDoc {
  return { cols: doc.cols, rows: doc.rows, cells: doc.cells.slice() };
}

export function inBounds(doc: AsciiDoc, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < doc.cols && y < doc.rows;
}

export function getCell(doc: AsciiDoc, x: number, y: number): string {
  if (!inBounds(doc, x, y)) return EMPTY;
  return doc.cells[y * doc.cols + x] ?? EMPTY;
}

export function setCell(
  doc: AsciiDoc,
  x: number,
  y: number,
  ch: string,
): void {
  if (!inBounds(doc, x, y)) return;
  doc.cells[y * doc.cols + x] = ch || EMPTY;
}

export function toText(doc: AsciiDoc, trimRight = true): string {
  const lines: string[] = [];
  for (let y = 0; y < doc.rows; y++) {
    let line = "";
    for (let x = 0; x < doc.cols; x++) {
      line += getCell(doc, x, y);
    }
    lines.push(trimRight ? line.replace(/ +$/, "") : line);
  }
  while (lines.length > 1 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines.join("\n");
}

export function fromText(
  text: string,
  minCols = 1,
  minRows = 1,
): AsciiDoc {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.length === 0 ? [""] : raw.split("\n");
  const cols = Math.max(minCols, ...lines.map((line) => line.length), 1);
  const rows = Math.max(minRows, lines.length, 1);
  const doc = createDoc(cols, rows);
  for (let y = 0; y < lines.length; y++) {
    const chars = Array.from(lines[y] ?? "");
    for (let x = 0; x < chars.length; x++) {
      setCell(doc, x, y, chars[x] ?? EMPTY);
    }
  }
  return doc;
}

export function resizeDoc(
  doc: AsciiDoc,
  cols: number,
  rows: number,
): AsciiDoc {
  const next = createDoc(cols, rows);
  const copyCols = Math.min(doc.cols, cols);
  const copyRows = Math.min(doc.rows, rows);
  for (let y = 0; y < copyRows; y++) {
    for (let x = 0; x < copyCols; x++) {
      setCell(next, x, y, getCell(doc, x, y));
    }
  }
  return next;
}

export function stampLines(
  doc: AsciiDoc,
  originX: number,
  originY: number,
  lines: string[],
  transparentSpace = true,
): void {
  for (let y = 0; y < lines.length; y++) {
    const chars = Array.from(lines[y] ?? "");
    for (let x = 0; x < chars.length; x++) {
      const ch = chars[x] ?? EMPTY;
      if (transparentSpace && ch === EMPTY) continue;
      setCell(doc, originX + x, originY + y, ch);
    }
  }
}

export function fillRect(
  doc: AsciiDoc,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  ch: string,
): void {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      setCell(doc, x, y, ch);
    }
  }
}

export function copyRect(
  doc: AsciiDoc,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { width: number; height: number; cells: string[] } {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const cells: string[] = [];
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      cells.push(getCell(doc, x, y));
    }
  }
  return { width, height, cells };
}

export function pasteRect(
  doc: AsciiDoc,
  originX: number,
  originY: number,
  patch: { width: number; height: number; cells: string[] },
): void {
  for (let y = 0; y < patch.height; y++) {
    for (let x = 0; x < patch.width; x++) {
      const ch = patch.cells[y * patch.width + x];
      if (ch === undefined) continue;
      setCell(doc, originX + x, originY + y, ch);
    }
  }
}

export function floodFill(
  doc: AsciiDoc,
  x: number,
  y: number,
  ch: string,
): void {
  if (!inBounds(doc, x, y)) return;
  const target = getCell(doc, x, y);
  if (target === ch) return;
  const stack: Array<[number, number]> = [[x, y]];
  const seen = new Set<number>();
  while (stack.length > 0) {
    const [cx, cy] = stack.pop() as [number, number];
    const i = cy * doc.cols + cx;
    if (seen.has(i) || !inBounds(doc, cx, cy)) continue;
    if (getCell(doc, cx, cy) !== target) continue;
    seen.add(i);
    setCell(doc, cx, cy, ch);
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

export function drawLineCells(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  while (true) {
    points.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

export function paintLine(
  doc: AsciiDoc,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  ch: string,
): void {
  for (const [x, y] of drawLineCells(x0, y0, x1, y1)) {
    setCell(doc, x, y, ch);
  }
}

export function centeredOrigin(
  doc: AsciiDoc,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.floor((doc.cols - width) / 2)),
    y: Math.max(0, Math.floor((doc.rows - height) / 2)),
  };
}
