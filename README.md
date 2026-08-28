```
                 ▄▄▄
 ▄█████▄    ▄███████████▄    ▄███████   ▄███████   ▄███████   ▄█   █▄    ▄█   █▄
███   ███  ███   ███   ███  ███   ███  ███   ███  ███   ███  ███   ███  ███   ███
███   ███  ███   ███   ███  ███   ███  ███   ███  ███   █▀   ███   ███  ███   ███
███   ███  ███   ███   ███ ▄███▄▄▄███ ▄███▄▄▄██▀  ███       ▄███▄▄▄███▄ ███▄▄▄███
███   ███  ███   ███   ███ ▀███▀▀▀███ ▀███▀▀▀▀    ███      ▀▀███▀▀▀███  ▀▀▀▀▀▀███
███   ███  ███   ███   ███  ███   ███ ██████████  ███   █▄   ███   ███  ▄██   ███
███   ███  ███   ███   ███  ███   ███  ███   ███  ███   ███  ███   ███  ███   ███
 ▀█████▀    ▀█   ███   █▀   ███   █▀   ███   ███  ███████▀   ███   █▀    ▀█████▀
                                       ███   █▀
```

# Omarchy Screensaver Studio

A Photoshop-style ASCII studio for the Omarchy screensaver. The canvas is the art!

You paint every printable ASCII character on a live grid, and the Type tool stamps Delta Corps Priest 1 with digits and punctuation filled in, not just letters.

![Omarchy Screensaver Studio](docs/studio.png)

## Get it

On GitHub: **Code → Download ZIP**. Unzip, then open that folder in a terminal (Super + Return).

Direct link: [omarchy-screensaver-editor-main.zip](https://github.com/fordfisher/omarchy-screensaver-editor/archive/refs/heads/main.zip)

Or clone:

```bash
git clone https://github.com/fordfisher/omarchy-screensaver-editor.git
cd omarchy-screensaver-editor
```

You need Node. Super + Space → Install → Package → `npm`, or:

```bash
omarchy pkg add npm
```

Then:

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147).

## Paint

| Key | Tool |
| --- | --- |
| V | Marquee / move |
| B | Pencil |
| E | Eraser |
| G | Fill |
| I | Eyedropper (right-click samples too) |
| L | Line |
| U | Rectangle |
| T | Type wordmark onto the canvas |

Press any printable key to set the brush (when you're not typing). Wheel zooms. Middle-drag or right-drag pans.

Type: click a cell, type `OMARCHY 4.0!`, Enter commits, Esc cancels. The glyphs land where you clicked.

**File → Place image** stamps a PNG/JPEG/WebP onto the grid. Full ASCII is the default ramp. Pick **Omarchy 3** if you want the old █ ▀ ▄ look.

## Put it on the screensaver

**Save** downloads `screensaver.txt`. Drop it where Omarchy already looks:

```bash
cp ~/Downloads/screensaver.txt ~/.config/omarchy/branding/screensaver.txt
```

No root. Super + Esc fires the screensaver. Or Super + Space → Style → Screensaver.

## The old editor

The original three-glyph grid (█ ▄ ▀, with a separate preview) is in `legacy/`:

```bash
python3 legacy/screensaver-editor.py
```

That one's http://127.0.0.1:8099 and writes the same branding file.
