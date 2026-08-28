"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { toast, Toaster } from "sonner";
import {
  Download,
  Eraser,
  Grid3x3,
  ImageIcon,
  Minus,
  MousePointer2,
  PaintBucket,
  Pencil,
  Pipette,
  Plus,
  Redo2,
  Square,
  Type,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BarItem, BarMenu, BarSep, Modal } from "@/components/studio/chrome";
import { imageDataToLines, RAMPS } from "@/lib/ascii-image";
import { wordmarkDoc } from "@/lib/defaults";
import {
  cloneDoc,
  copyRect,
  createDoc,
  fillRect,
  floodFill,
  fromText,
  getCell,
  paintLine,
  pasteRect,
  resizeDoc,
  setCell,
  stampLines,
  toText,
  type AsciiDoc,
} from "@/lib/document";
import { printableAscii, renderFiglet } from "@/lib/font";
import { cn } from "@/lib/utils";

import { AsciiCanvas, cellSize } from "@/components/studio/ascii-canvas";
import {
  OMARCHY_BLOCKS,
  PRINTABLE_ASCII,
  TOOL_KEYS,
  type Cell,
  type Marquee,
  type Tool,
  type TypeSession,
} from "@/components/studio/types";

const INK = "#cdd6f4";
const PAPER = "#11111b";
const HISTORY_LIMIT = 80;

function downloadText(filename: string, text: string) {
  const blob = new Blob([text.endsWith("\n") ? text : `${text}\n`], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

export function Studio() {
  const [doc, setDoc] = useState<AsciiDoc>(() => wordmarkDoc("OMARCHY"));
  const [tool, setTool] = useState<Tool>("pencil");
  const [brush, setBrush] = useState("█");
  const [zoom, setZoom] = useState(16);
  const [pan, setPan] = useState({ x: 48, y: 36 });
  const [showGrid, setShowGrid] = useState(true);
  const [hover, setHover] = useState<Cell | null>(null);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [typeSession, setTypeSession] = useState<TypeSession | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [fileMenu, setFileMenu] = useState(false);
  const [imageMenu, setImageMenu] = useState(false);
  const typeInputRef = useRef<HTMLInputElement>(null);
  const [resizeCols, setResizeCols] = useState(100);
  const [resizeRows, setResizeRows] = useState(28);
  const [rampName, setRampName] = useState<keyof typeof RAMPS>("full");
  const [invertPlace, setInvertPlace] = useState(false);

  const undo = useRef<AsciiDoc[]>([]);
  const redo = useRef<AsciiDoc[]>([]);
  const strokeBase = useRef<AsciiDoc | null>(null);
  const strokeOrigin = useRef<AsciiDoc | null>(null);
  const typeBase = useRef<AsciiDoc | null>(null);
  const dragging = useRef(false);
  const lineStart = useRef<Cell | null>(null);
  const movePatch = useRef<ReturnType<typeof copyRect> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const pendingImage = useRef<File | null>(null);

  const commit = useCallback((next: AsciiDoc, from = doc) => {
    undo.current = [...undo.current, cloneDoc(from)].slice(-HISTORY_LIMIT);
    redo.current = [];
    setDoc(next);
    setDirty(true);
  }, [doc]);

  const undoOnce = useCallback(() => {
    const prev = undo.current.pop();
    if (!prev) return;
    redo.current.push(cloneDoc(doc));
    setDoc(prev);
    setDirty(true);
  }, [doc]);

  const redoOnce = useCallback(() => {
    const next = redo.current.pop();
    if (!next) return;
    undo.current.push(cloneDoc(doc));
    setDoc(next);
    setDirty(true);
  }, [doc]);

  const endTypeSession = useCallback(
    (keep: boolean) => {
      if (!typeSession) return;
      if (!keep && typeBase.current) {
        setDoc(typeBase.current);
      } else if (keep && typeBase.current && typeSession.buffer.length > 0) {
        undo.current = [...undo.current, cloneDoc(typeBase.current)].slice(
          -HISTORY_LIMIT,
        );
        redo.current = [];
        setDirty(true);
      }
      typeBase.current = null;
      setTypeSession(null);
    },
    [typeSession],
  );

  const startTypeAt = useCallback(
    (cell: Cell) => {
      endTypeSession(true);
      typeBase.current = cloneDoc(doc);
      setTypeSession({ x: cell.x, y: cell.y, buffer: "" });
      queueMicrotask(() => typeInputRef.current?.focus());
    },
    [doc, endTypeSession],
  );

  const applyTypeBuffer = useCallback(
    (buffer: string) => {
      if (!typeSession) return;
      const next = cloneDoc(typeBase.current ?? doc);
      if (buffer.length > 0) {
        stampLines(next, typeSession.x, typeSession.y, renderFiglet(buffer));
      }
      setDoc(next);
      setTypeSession({ ...typeSession, buffer });
    },
    [doc, typeSession],
  );

  useEffect(() => {
    if (typeSession) typeInputRef.current?.focus();
  }, [typeSession]);

  const paintAt = useCallback(
    (target: AsciiDoc, cell: Cell, ch: string) => {
      setCell(target, cell.x, cell.y, ch);
    },
    [],
  );

  const onCellDown = useCallback(
    (cell: Cell, event: PointerEvent<HTMLDivElement>) => {
      if (spaceDown || event.button === 1) return;
      if (tool !== "type") endTypeSession(true);

      if (event.button === 2) {
        setBrush(getCell(doc, cell.x, cell.y));
        return;
      }

      dragging.current = true;

      if (tool === "type") {
        startTypeAt(cell);
        return;
      }

      if (tool === "eyedropper") {
        setBrush(getCell(doc, cell.x, cell.y));
        setTool("pencil");
        return;
      }

      if (tool === "fill") {
        const next = cloneDoc(doc);
        floodFill(next, cell.x, cell.y, brush);
        commit(next);
        return;
      }

      if (tool === "select") {
        strokeOrigin.current = cloneDoc(doc);
        strokeBase.current = cloneDoc(doc);
        if (marquee) {
          const left = Math.min(marquee.x0, marquee.x1);
          const top = Math.min(marquee.y0, marquee.y1);
          const right = Math.max(marquee.x0, marquee.x1);
          const bottom = Math.max(marquee.y0, marquee.y1);
          if (
            cell.x >= left &&
            cell.x <= right &&
            cell.y >= top &&
            cell.y <= bottom
          ) {
            movePatch.current = copyRect(doc, left, top, right, bottom);
            const cleared = cloneDoc(doc);
            fillRect(cleared, left, top, right, bottom, " ");
            setDoc(cleared);
            lineStart.current = cell;
            return;
          }
        }
        movePatch.current = null;
        setMarquee({ x0: cell.x, y0: cell.y, x1: cell.x, y1: cell.y });
        lineStart.current = cell;
        return;
      }

      strokeOrigin.current = cloneDoc(doc);
      strokeBase.current = cloneDoc(doc);
      lineStart.current = cell;
      const next = cloneDoc(doc);
      if (tool === "pencil") paintAt(next, cell, brush);
      if (tool === "eraser") paintAt(next, cell, " ");
      if (tool === "line" || tool === "rect") {
        /* preview on move */
      }
      setDoc(next);
    },
    [brush, commit, doc, endTypeSession, marquee, paintAt, spaceDown, startTypeAt, tool],
  );

  const onCellMove = useCallback(
    (cell: Cell) => {
      if (!dragging.current) return;
      if (tool === "select" && marquee && lineStart.current) {
        if (movePatch.current && strokeBase.current) {
          const dx = cell.x - lineStart.current.x;
          const dy = cell.y - lineStart.current.y;
          const left = Math.min(marquee.x0, marquee.x1);
          const top = Math.min(marquee.y0, marquee.y1);
          const next = cloneDoc(strokeBase.current);
          fillRect(
            next,
            left,
            top,
            Math.max(marquee.x0, marquee.x1),
            Math.max(marquee.y0, marquee.y1),
            " ",
          );
          pasteRect(next, left + dx, top + dy, movePatch.current);
          setDoc(next);
          setMarquee({
            x0: left + dx,
            y0: top + dy,
            x1: left + dx + movePatch.current.width - 1,
            y1: top + dy + movePatch.current.height - 1,
          });
          return;
        }
        setMarquee({
          x0: lineStart.current.x,
          y0: lineStart.current.y,
          x1: cell.x,
          y1: cell.y,
        });
        return;
      }
      if (!strokeBase.current || !lineStart.current) return;
      const next = cloneDoc(strokeBase.current);
      if (tool === "pencil") {
        paintLine(next, lineStart.current.x, lineStart.current.y, cell.x, cell.y, brush);
        lineStart.current = cell;
        strokeBase.current = cloneDoc(next);
      } else if (tool === "eraser") {
        paintLine(next, lineStart.current.x, lineStart.current.y, cell.x, cell.y, " ");
        lineStart.current = cell;
        strokeBase.current = cloneDoc(next);
      } else if (tool === "line") {
        paintLine(next, lineStart.current.x, lineStart.current.y, cell.x, cell.y, brush);
      } else if (tool === "rect") {
        fillRect(next, lineStart.current.x, lineStart.current.y, cell.x, cell.y, brush);
      }
      setDoc(next);
    },
    [brush, marquee, tool],
  );

  const onCellUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (strokeOrigin.current && tool !== "type" && tool !== "fill" && tool !== "eyedropper") {
      if (tool === "select") {
        if (movePatch.current) {
          commit(cloneDoc(doc), strokeOrigin.current);
        }
      } else {
        commit(cloneDoc(doc), strokeOrigin.current);
      }
    }
    strokeBase.current = null;
    strokeOrigin.current = null;
    lineStart.current = null;
    movePatch.current = null;
  }, [commit, doc, tool]);

  const onZoom = useCallback(
    (next: number, around: { x: number; y: number }) => {
      const old = cellSize(zoom);
      const neu = cellSize(next);
      const worldX = (around.x - pan.x) / old.width;
      const worldY = (around.y - pan.y) / old.height;
      setPan({
        x: around.x - worldX * neu.width,
        y: around.y - worldY * neu.height,
      });
      setZoom(next);
    },
    [pan.x, pan.y, zoom],
  );

  const exportText = useMemo(() => toText(doc), [doc]);

  const newBlank = () => {
    endTypeSession(false);
    commit(createDoc(doc.cols, doc.rows));
    setMarquee(null);
  };

  const newWordmark = (text = "OMARCHY") => {
    endTypeSession(false);
    commit(wordmarkDoc(text));
    setMarquee(null);
  };

  const openTextFile = async (file: File) => {
    const text = await file.text();
    endTypeSession(false);
    commit(fromText(text, 40, 12));
    setMarquee(null);
    toast("Opened " + file.name);
  };

  const placeImage = async (file: File) => {
    const img = await loadImageFile(file);
    const canvas = document.createElement("canvas");
    canvas.width = doc.cols;
    canvas.height = doc.rows;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(doc.cols / img.width, doc.rows / img.height);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const ox = Math.floor((doc.cols - w) / 2);
    const oy = Math.floor((doc.rows - h) / 2);
    ctx.drawImage(img, ox, oy, w, h);
    const data = ctx.getImageData(0, 0, doc.cols, doc.rows);
    const ramp = RAMPS[rampName];
    const lines = imageDataToLines(data, ramp, invertPlace);
    const next = cloneDoc(doc);
    stampLines(next, 0, 0, lines, false);
    commit(next);
    toast("Image stamped on the canvas");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.code === "Space") {
        setSpaceDown(true);
        event.preventDefault();
        return;
      }

      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redoOnce();
        else undoOnce();
        return;
      }
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        downloadText("screensaver.txt", toText(doc));
        setDirty(false);
        toast("Saved screensaver.txt");
        return;
      }
      if (meta && event.key.toLowerCase() === "c" && marquee) {
        const patch = copyRect(
          doc,
          marquee.x0,
          marquee.y0,
          marquee.x1,
          marquee.y1,
        );
        const lines: string[] = [];
        for (let y = 0; y < patch.height; y++) {
          let line = "";
          for (let x = 0; x < patch.width; x++) {
            line += patch.cells[y * patch.width + x] ?? " ";
          }
          lines.push(line.replace(/ +$/, ""));
        }
        void navigator.clipboard.writeText(lines.join("\n"));
        toast("Copied selection");
        return;
      }

      if (typeSession) {
        if (event.key === "Escape") {
          endTypeSession(false);
          event.preventDefault();
          return;
        }
        if (event.key === "Enter" && !event.shiftKey) {
          endTypeSession(true);
          event.preventDefault();
          return;
        }
        if (event.key === "Backspace") {
          const buffer = typeSession.buffer.slice(0, -1);
          const next = cloneDoc(typeBase.current ?? doc);
          if (buffer.length > 0) {
            stampLines(next, typeSession.x, typeSession.y, renderFiglet(buffer));
          }
          setDoc(next);
          setTypeSession({ ...typeSession, buffer });
          event.preventDefault();
          return;
        }
        if (event.key.length === 1 && !meta) {
          const buffer = typeSession.buffer + event.key;
          const art = renderFiglet(buffer);
          const next = cloneDoc(typeBase.current ?? doc);
          stampLines(next, typeSession.x, typeSession.y, art);
          setDoc(next);
          setTypeSession({ ...typeSession, buffer });
          event.preventDefault();
        }
        return;
      }

      if (event.key === "Escape") {
        setMarquee(null);
        return;
      }
      if (event.key === "?" || (event.shiftKey && event.key === "/")) {
        setHelpOpen(true);
        return;
      }
      if (event.key === "+" || event.key === "=") {
        setZoom((z) => Math.min(48, z + 2));
        return;
      }
      if (event.key === "-" || event.key === "_") {
        setZoom((z) => Math.max(8, z - 2));
        return;
      }
      const mapped = TOOL_KEYS[event.key.toLowerCase()];
      if (mapped && !meta) {
        setTool(mapped);
        return;
      }
      if (event.key.length === 1 && !meta && PRINTABLE_ASCII.includes(event.key)) {
        setBrush(event.key);
      }
    };
    const onUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [doc, endTypeSession, marquee, redoOnce, typeSession, undoOnce]);

  const cursor = spaceDown
    ? "grab"
    : tool === "type"
      ? "text"
      : tool === "eyedropper"
        ? "crosshair"
        : "cell";

  const hoverChar = hover ? getCell(doc, hover.x, hover.y) : null;
  const tools: Array<{ id: Tool; icon: ReactNode; label: string }> = [
    { id: "select", icon: <MousePointer2 />, label: "Move / marquee (V)" },
    { id: "pencil", icon: <Pencil />, label: "Pencil (B)" },
    { id: "eraser", icon: <Eraser />, label: "Eraser (E)" },
    { id: "fill", icon: <PaintBucket />, label: "Fill (G)" },
    { id: "eyedropper", icon: <Pipette />, label: "Eyedropper (I)" },
    { id: "line", icon: <Minus />, label: "Line (L)" },
    { id: "rect", icon: <Square />, label: "Rectangle (U)" },
    { id: "type", icon: <Type />, label: "Type wordmark (T)" },
  ];

  return (
    <>
    <div className="flex h-dvh min-h-0 flex-col bg-zinc-950 text-zinc-100">
        <header className="relative z-40 flex h-10 shrink-0 items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-2">
          <span className="px-2 font-mono text-xs tracking-wide text-zinc-400">
            Omarchy Screensaver Studio
          </span>
          <BarMenu
            label="File"
            open={fileMenu}
            onToggle={() => {
              setFileMenu((v) => !v);
              setImageMenu(false);
            }}
            onClose={() => setFileMenu(false)}
          >
            <BarItem
              onClick={() => {
                newWordmark("OMARCHY");
                setFileMenu(false);
              }}
            >
              New from OMARCHY
            </BarItem>
            <BarItem
              onClick={() => {
                newBlank();
                setFileMenu(false);
              }}
            >
              Blank canvas
            </BarItem>
            <BarItem
              onClick={() => {
                fileRef.current?.click();
                setFileMenu(false);
              }}
            >
              Open screensaver.txt…
            </BarItem>
            <BarItem
              onClick={() => {
                imageRef.current?.click();
                setFileMenu(false);
              }}
            >
              Place image…
            </BarItem>
            <BarSep />
            <BarItem
              onClick={() => {
                downloadText("screensaver.txt", exportText);
                setDirty(false);
                setFileMenu(false);
                toast("Downloaded screensaver.txt");
              }}
            >
              Download screensaver.txt
            </BarItem>
            <BarItem
              onClick={() => {
                void navigator.clipboard.writeText(exportText);
                setFileMenu(false);
                toast("Copied the canvas as text");
              }}
            >
              Copy all as text
            </BarItem>
            <BarSep />
            <BarItem
              onClick={() => {
                setApplyOpen(true);
                setFileMenu(false);
              }}
            >
              Apply on Omarchy…
            </BarItem>
          </BarMenu>
          <BarMenu
            label="Image"
            open={imageMenu}
            onToggle={() => {
              setImageMenu((v) => !v);
              setFileMenu(false);
            }}
            onClose={() => setImageMenu(false)}
          >
            <BarItem
              onClick={() => {
                setResizeCols(doc.cols);
                setResizeRows(doc.rows);
                setResizeOpen(true);
                setImageMenu(false);
              }}
            >
              Canvas size…
            </BarItem>
            <BarItem
              onClick={() => {
                pendingImage.current = null;
                setPlaceOpen(true);
                setImageMenu(false);
              }}
            >
              Image → ASCII settings
            </BarItem>
          </BarMenu>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHelpOpen(true)}
          >
            Help
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={undoOnce}
              aria-label="Undo"
            >
              <Undo2 />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={redoOnce}
              aria-label="Redo"
            >
              <Redo2 />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowGrid((g) => !g)}
              aria-label="Toggle grid"
              className={showGrid ? "bg-zinc-800" : undefined}
            >
              <Grid3x3 />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom((z) => Math.max(8, z - 2))}
              aria-label="Zoom out"
            >
              <Minus />
            </Button>
            <span className="w-10 text-center font-mono text-[11px] text-zinc-400">
              {Math.round((zoom / 16) * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom((z) => Math.min(48, z + 2))}
              aria-label="Zoom in"
            >
              <Plus />
            </Button>
            <Button
              size="sm"
              className="ml-2"
              onClick={() => {
                downloadText("screensaver.txt", exportText);
                setDirty(false);
                setApplyOpen(true);
              }}
            >
              <Download data-icon="inline-start" />
              Save
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-zinc-800 bg-zinc-900 py-2">
            {tools.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="icon-sm"
                title={item.label}
                aria-label={item.label}
                aria-pressed={tool === item.id}
                className={cn(tool === item.id && "bg-zinc-800 text-emerald-300")}
                onClick={() => {
                  endTypeSession(true);
                  setTool(item.id);
                }}
              >
                {item.icon}
              </Button>
            ))}
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex h-9 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900/80 px-3 text-xs text-zinc-400">
              {tool === "type" ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="shrink-0">Type on the grid</span>
                  {typeSession ? (
                    <input
                      ref={typeInputRef}
                      data-testid="type-input"
                      value={typeSession.buffer}
                      autoComplete="off"
                      aria-label="Wordmark text"
                      placeholder="Type here — it stamps where you clicked"
                      className="h-7 min-w-0 flex-1 rounded border border-emerald-700 bg-black px-2 font-mono text-sm text-emerald-200 outline-none"
                      onChange={(event) => applyTypeBuffer(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          endTypeSession(true);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          endTypeSession(false);
                        }
                      }}
                    />
                  ) : (
                    <span>Click the paper, then type. Enter commits.</span>
                  )}
                </div>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    Brush
                    <kbd className="inline-flex h-7 min-w-7 items-center justify-center rounded border border-zinc-700 bg-black px-1 font-mono text-sm text-zinc-100">
                      {brush === " " ? "␣" : brush}
                    </kbd>
                  </span>
                  <span className="hidden sm:inline">
                    Click a swatch or press a key. Right-click samples.
                  </span>
                </>
              )}
            </div>
            <AsciiCanvas
              doc={doc}
              zoom={zoom}
              pan={pan}
              showGrid={showGrid}
              ink={INK}
              paper={PAPER}
              hover={hover}
              marquee={marquee}
              typeSession={typeSession}
              cursor={cursor}
              onHover={setHover}
              onCellDown={onCellDown}
              onCellMove={onCellMove}
              onCellUp={onCellUp}
              onPan={setPan}
              onZoom={onZoom}
            />
            <div className="flex shrink-0 gap-1 overflow-x-auto border-t border-zinc-800 bg-zinc-900 p-2 md:hidden">
              {[...OMARCHY_BLOCKS, ...PRINTABLE_ASCII].map((ch) => (
                <Swatch
                  key={`m-${ch === " " ? "space" : ch}`}
                  ch={ch}
                  active={brush === ch}
                  onPick={setBrush}
                />
              ))}
            </div>
          </div>

          <aside className="hidden w-64 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900 md:flex">
            <div className="border-b border-zinc-800 px-3 py-2">
              <div className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                Characters
              </div>
              <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                All 95 printable ASCII characters. Stock Omarchy block mode only
                had █ ▀ ▄.
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3">
                <div className="mb-2 text-[10px] tracking-wide text-zinc-500 uppercase">
                  Omarchy blocks
                </div>
                <div className="mb-3 grid grid-cols-8 gap-0.5">
                  {OMARCHY_BLOCKS.map((ch) => (
                    <Swatch
                      key={ch}
                      ch={ch}
                      active={brush === ch}
                      onPick={setBrush}
                    />
                  ))}
                </div>
                <div className="mb-2 text-[10px] tracking-wide text-zinc-500 uppercase">
                  Printable ASCII
                </div>
                <div className="grid grid-cols-8 gap-0.5">
                  {PRINTABLE_ASCII.map((ch) => (
                    <Swatch
                      key={ch === " " ? "space" : ch}
                      ch={ch}
                      active={brush === ch}
                      onPick={setBrush}
                    />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </aside>
        </div>

        <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-zinc-800 bg-zinc-900 px-3 font-mono text-[11px] text-zinc-500">
          <span>
            {doc.cols}×{doc.rows}
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span>
            {hover
              ? `${hover.x},${hover.y}  ${JSON.stringify(hoverChar)}`
              : "—"}
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span className="truncate">
            {tool}
            {typeSession ? ` · typing “${typeSession.buffer}”` : ""}
          </span>
          <span className="ml-auto truncate text-zinc-600">
            {dirty ? "unsaved" : "saved"} · {printableAscii().length} ASCII
            glyphs in the wordmark font
          </span>
        </footer>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void openTextFile(file);
          event.target.value = "";
        }}
      />
      <input
        ref={imageRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          pendingImage.current = file;
          setPlaceOpen(true);
        }}
      />

      <Modal
        open={resizeOpen}
        title="Canvas size"
        description="Screensaver art is character cells, not pixels. 100×28 fits a typical Omarchy wordmark with room to paint."
        onClose={() => setResizeOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setResizeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const cols = Math.min(300, Math.max(8, resizeCols || 8));
                const rows = Math.min(120, Math.max(4, resizeRows || 4));
                commit(resizeDoc(doc, cols, rows));
                setResizeOpen(false);
              }}
            >
              Resize
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cols">Columns</Label>
            <Input
              id="cols"
              type="number"
              min={8}
              max={300}
              value={resizeCols}
              onChange={(e) => setResizeCols(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rows">Rows</Label>
            <Input
              id="rows"
              type="number"
              min={4}
              max={120}
              value={resizeRows}
              onChange={(e) => setResizeRows(Number(e.target.value))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={placeOpen}
        title="Place image as ASCII"
        description="Stamps onto this canvas. Full ASCII uses every printable character. Omarchy 3 is the old █ ▀ ▄ converter."
        onClose={() => setPlaceOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setPlaceOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (pendingImage.current) {
                  void placeImage(pendingImage.current);
                  pendingImage.current = null;
                  setPlaceOpen(false);
                  return;
                }
                imageRef.current?.click();
                setPlaceOpen(false);
              }}
            >
              <ImageIcon data-icon="inline-start" />
              Choose image
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ramp">Character ramp</Label>
            <select
              id="ramp"
              className="h-8 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
              value={rampName}
              onChange={(e) =>
                setRampName(e.target.value as keyof typeof RAMPS)
              }
            >
              <option value="full">Full ASCII (all 95)</option>
              <option value="omarchy3">Omarchy 3 (█ ▀ ▄)</option>
              <option value="blocks">Blocks (█▓▒░)</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={invertPlace}
              onChange={(e) => setInvertPlace(e.target.checked)}
            />
            Invert (light logo on dark)
          </label>
        </div>
      </Modal>

      <Modal
        open={applyOpen}
        title="Apply on Omarchy"
        description="The screensaver reads one file. Download the canvas, then drop it where Omarchy already looks."
        onClose={() => setApplyOpen(false)}
        wide
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(
                  "cp ~/Downloads/screensaver.txt ~/.config/omarchy/branding/screensaver.txt",
                );
                toast("Copied the cp command");
              }}
            >
              Copy command
            </Button>
            <Button
              onClick={() => {
                downloadText("screensaver.txt", exportText);
                setDirty(false);
              }}
            >
              <Download data-icon="inline-start" />
              Download
            </Button>
          </>
        }
      >
        <ol className="list-decimal space-y-2 pl-4 text-sm text-zinc-300">
          <li>
            Save downloads{" "}
            <code className="font-mono text-xs">screensaver.txt</code>.
          </li>
          <li>
            On the laptop:{" "}
            <code className="font-mono text-xs">
              cp ~/Downloads/screensaver.txt ~/.config/omarchy/branding/screensaver.txt
            </code>
          </li>
          <li>
            Preview with Super+Esc, or Style → Screensaver. Any key walks out.
          </li>
        </ol>
      </Modal>

      <Modal
        open={helpOpen}
        title="The canvas is the art"
        description="No editor/preview split. Paint, type, and stamp on the same grid the screensaver will show."
        onClose={() => setHelpOpen(false)}
        wide
        footer={
          <Button onClick={() => setHelpOpen(false)}>Close</Button>
        }
      >
        <div className="grid gap-2 font-mono text-xs text-zinc-300">
          <p>V select · B pencil · E eraser · G fill · I eyedropper</p>
          <p>L line · U rectangle · T type wordmark</p>
          <p>Any printable key sets the brush (when not typing)</p>
          <p>Ctrl/⌘ Z undo · Shift+Ctrl/⌘ Z redo · Ctrl/⌘ S save</p>
          <p>Wheel zoom · middle-drag or right-drag pan · Space grab</p>
          <p>Type tool uses the full Delta Corps Priest set, not just letters.</p>
        </div>
      </Modal>

      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}

function Swatch({
  ch,
  active,
  onPick,
}: {
  ch: string;
  active: boolean;
  onPick: (ch: string) => void;
}) {
  return (
    <button
      type="button"
      title={ch === " " ? "space" : ch}
      onClick={() => onPick(ch)}
      className={cn(
        "flex h-7 items-center justify-center rounded border font-mono text-sm",
        active
          ? "border-emerald-400 bg-emerald-400/15 text-emerald-200"
          : "border-zinc-800 bg-black text-zinc-200 hover:border-zinc-600",
      )}
    >
      {ch === " " ? "␣" : ch}
    </button>
  );
}
