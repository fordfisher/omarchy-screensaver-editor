# Omarchy Screensaver Studio

A Photoshop-style ASCII studio for the Omarchy screensaver. The canvas **is** the art — no text editor on the left and preview on the right.

Stock Omarchy `transcode ascii --mode block` only paints with three glyphs (`█ ▀ ▄`). The community Screensaver Maker / Raven editor types a word, shows a zenity preview, then writes `~/.config/omarchy/branding/screensaver.txt`. This app replaces both: you paint every printable ASCII character on a live grid, and the Type tool stamps **Delta Corps Priest 1** with digits and punctuation filled in, not just letters.

## Run

```bash
npm install
npm test
npm run dev
```

Opens on [http://127.0.0.1:43147](http://127.0.0.1:43147) (Vite).

## Tools

| Key | Tool |
| --- | --- |
| V | Marquee / move |
| B | Pencil |
| E | Eraser |
| G | Fill |
| I | Eyedropper (right-click also samples) |
| L | Line |
| U | Rectangle |
| T | Type wordmark onto the canvas |

Press any printable key (when you are not in the Type tool) to set the brush. Wheel zooms. Middle-drag or right-drag pans.

Type: click a cell, type `OMARCHY 4.0!`, Enter commits, Esc cancels. The glyphs appear where you clicked.

## Apply on Omarchy

1. **Save** downloads `screensaver.txt`.
2. Copy it into place:

```bash
cp ~/Downloads/screensaver.txt ~/.config/omarchy/branding/screensaver.txt
```

3. Super+Esc to fire the screensaver, or Style → Screensaver.

No root needed. Omarchy already watches that file.

## Image → ASCII

**File → Place image** stamps a PNG/JPEG/WebP onto the canvas. The default ramp is all 95 printable ASCII characters. Switch to **Omarchy 3** if you want the old three-block look.

## Tests

```bash
npm test
```

Covers the patched font (every code 32–126 has a glyph), canvas paint/fill, and the full ASCII ramp.
