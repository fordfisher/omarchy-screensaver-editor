import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALL_PRINTABLE_RAMP,
  convertImageToLines,
  grayPercentToChar,
  grayScaleLegend,
  grayToChar,
  imageDataToLines,
  luminancePercent,
  mapGrayPercent,
  OMARCHY_THREE,
  rampCoversPrintableAscii,
  uniqueChars,
} from "./ascii-image";

describe("ascii image ramps", () => {
  it("full ramp covers every printable ASCII character", () => {
    assert.equal(rampCoversPrintableAscii(ALL_PRINTABLE_RAMP), true);
    assert.equal(uniqueChars(ALL_PRINTABLE_RAMP).length, 95);
  });

  it("Omarchy block mode is the original three glyphs plus space", () => {
    const set = new Set(Array.from(OMARCHY_THREE));
    assert.equal(set.size, 4);
    assert.ok(set.has("█") && set.has("▀") && set.has("▄") && set.has(" "));
  });

  it("maps dark pixels to dense characters", () => {
    assert.notEqual(grayToChar(0, ALL_PRINTABLE_RAMP), " ");
    assert.equal(grayToChar(1, ALL_PRINTABLE_RAMP), " ");
  });

  it("converts a pixel buffer into lines", () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255,
    ]);
    const lines = imageDataToLines({ width: 2, height: 2, data }, "@ ");
    assert.equal(lines[0], "@");
    assert.ok(lines.length >= 1);
  });
});

describe("grayscale 0-100% converter", () => {
  it("reports black, mid, and white as 0, 50-ish, and 100 percent", () => {
    assert.equal(luminancePercent(0, 0, 0), 0);
    assert.equal(luminancePercent(255, 255, 255), 100);
    const mid = luminancePercent(128, 128, 128);
    assert.ok(mid > 49 && mid < 51);
  });

  it("stretches black/white points on the 0-100 scale", () => {
    assert.equal(mapGrayPercent(0, 0, 100), 0);
    assert.equal(mapGrayPercent(100, 0, 100), 1);
    assert.equal(mapGrayPercent(50, 0, 100), 0.5);
    assert.equal(mapGrayPercent(10, 20, 80), 0);
    assert.equal(mapGrayPercent(80, 20, 80), 1);
    assert.ok(Math.abs(mapGrayPercent(50, 20, 80) - 0.5) < 0.001);
  });

  it("maps 0% to a dense glyph and 100% to space", () => {
    const opts = { ramp: "@#. " };
    assert.equal(grayPercentToChar(0, opts), "@");
    assert.equal(grayPercentToChar(100, opts), " ");
  });

  it("inverts so a white logo stamps dense on dark paper", () => {
    const opts = { ramp: "@ ", invert: true };
    assert.equal(grayPercentToChar(100, opts), "@");
    assert.equal(grayPercentToChar(0, opts), " ");
  });

  it("builds a 0-100% legend and converts a gray pixel buffer", () => {
    const legend = grayScaleLegend({ ramp: "█▓▒░ " });
    assert.equal(legend.length, 11);
    assert.equal(legend[0], "█");
    assert.equal(legend[legend.length - 1], " ");

    const data = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const lines = convertImageToLines(
      { width: 2, height: 1, data },
      { ramp: "@ ", black: 0, white: 100 },
    );
    assert.equal(lines[0], "@");
  });
});
