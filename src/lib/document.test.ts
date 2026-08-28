import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cloneDoc,
  createDoc,
  floodFill,
  fromText,
  getCell,
  paintLine,
  setCell,
  stampLines,
  toText,
} from "./document";

describe("ascii document", () => {
  it("round-trips text", () => {
    const src = "AB\n C";
    assert.equal(toText(fromText(src)), src);
  });

  it("stamps without wiping spaces when transparent", () => {
    const doc = fromText("XXXX\nXXXX");
    stampLines(doc, 0, 0, ["A B"]);
    assert.equal(toText(doc), "AXBX\nXXXX");
  });

  it("flood-fills a region", () => {
    const doc = fromText("..#.\n..#.\n....");
    floodFill(doc, 0, 0, "@");
    assert.equal(getCell(doc, 0, 0), "@");
    assert.equal(getCell(doc, 1, 1), "@");
    assert.equal(getCell(doc, 2, 0), "#");
    assert.equal(getCell(doc, 0, 2), "@");
  });

  it("paints a line", () => {
    const doc = createDoc(5, 3);
    paintLine(doc, 0, 0, 4, 0, "#");
    assert.equal(toText(doc), "#####");
  });

  it("clones independently", () => {
    const doc = createDoc(2, 1, ".");
    const copy = cloneDoc(doc);
    setCell(copy, 0, 0, "A");
    assert.equal(getCell(doc, 0, 0), ".");
  });
});
