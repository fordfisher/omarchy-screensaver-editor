import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALL_PRINTABLE_RAMP,
  grayToChar,
  imageDataToLines,
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
