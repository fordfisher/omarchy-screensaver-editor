export type Tool =
  | "select"
  | "pencil"
  | "eraser"
  | "fill"
  | "eyedropper"
  | "line"
  | "rect"
  | "type";

export type Cell = { x: number; y: number };

export type Marquee = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type TypeGhost = {
  x: number;
  y: number;
  lines: string[];
};

export const PRINTABLE_ASCII: string[] = Array.from({ length: 95 }, (_, i) =>
  String.fromCharCode(32 + i),
);

export const OMARCHY_BLOCKS = ["█", "▀", "▄", "▌", "▐", "░", "▒", "▓"];

export const TOOL_KEYS: Record<string, Tool> = {
  v: "select",
  b: "pencil",
  e: "eraser",
  g: "fill",
  i: "eyedropper",
  l: "line",
  u: "rect",
  t: "type",
};
