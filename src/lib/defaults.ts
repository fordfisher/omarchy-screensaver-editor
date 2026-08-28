import {
  centeredOrigin,
  createDoc,
  stampLines,
  type AsciiDoc,
} from "@/lib/document";
import { figletWidth, renderFiglet } from "@/lib/font";

export const DEFAULT_COLS = 100;
export const DEFAULT_ROWS = 28;

export function wordmarkDoc(text = "OMARCHY"): AsciiDoc {
  const art = renderFiglet(text);
  const cols = Math.max(DEFAULT_COLS, figletWidth(art) + 6);
  const rows = Math.max(DEFAULT_ROWS, art.length + 6);
  const doc = createDoc(cols, rows);
  const origin = centeredOrigin(doc, figletWidth(art), art.length);
  stampLines(doc, origin.x, origin.y, art);
  return doc;
}
