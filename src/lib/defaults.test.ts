import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getCell, toText } from "./document";
import { wordmarkDoc } from "./defaults";

describe("default wordmark", () => {
  it("stamps OMARCHY onto the canvas with block glyphs", () => {
    const doc = wordmarkDoc("OMARCHY");
    const text = toText(doc);
    assert.ok(text.includes("█"));
    let ink = 0;
    for (let y = 0; y < doc.rows; y++) {
      for (let x = 0; x < doc.cols; x++) {
        if (getCell(doc, x, y) !== " ") ink++;
      }
    }
    assert.ok(ink > 100);
  });
});
