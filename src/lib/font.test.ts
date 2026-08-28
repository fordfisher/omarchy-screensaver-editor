import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FONT, hasGlyph, missingGlyphs, renderFiglet } from "./font";

describe("Delta Corps Priest — full ASCII", () => {
  it("has a glyph for every printable ASCII character", () => {
    const missing: string[] = [];
    for (let code = 32; code <= 126; code++) {
      const ch = String.fromCharCode(code);
      if (!hasGlyph(ch, FONT)) missing.push(`${code}:${JSON.stringify(ch)}`);
    }
    assert.deepEqual(missing, []);
  });

  it("renders digits, punctuation, and letters without skipping", () => {
    assert.deepEqual(missingGlyphs("OMARCHY 4.0!"), []);
    assert.deepEqual(missingGlyphs("Hello, Ford. [test] {ok} ~$%"), []);
    const art = renderFiglet("A1!");
    assert.ok(art.some((row) => row.trim().length > 0));
    assert.equal(art.length, 9);
  });

  it("keeps the Omarchy wordmark shape", () => {
    const art = renderFiglet("OMARCHY");
    const joined = art.join("\n");
    assert.ok(joined.includes("█"));
    assert.ok(joined.includes("▀") || joined.includes("▄"));
  });
});
