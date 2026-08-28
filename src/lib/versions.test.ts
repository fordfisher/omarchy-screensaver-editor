import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dropVersion,
  ensurePinned,
  parseVersions,
  pushVersion,
  serializeVersions,
  versionFilename,
  WORDMARK_VERSION_ID,
} from "./versions";

const wordmark = {
  id: WORDMARK_VERSION_ID,
  label: "OMARCHY wordmark",
  createdAt: 1,
  text: "OMARCHY",
  pinned: true as const,
};

describe("screensaver versions", () => {
  it("skips a snapshot that matches the latest copy", () => {
    const first = pushVersion([], {
      label: "Saved",
      createdAt: 10,
      text: "AAA",
    });
    const again = pushVersion(first, {
      label: "Saved",
      createdAt: 11,
      text: "AAA",
    });
    assert.equal(again.length, 1);
    assert.equal(again[0]?.createdAt, 10);
  });

  it("keeps the pinned wordmark when new saves come in", () => {
    const seeded = ensurePinned([], wordmark);
    const next = pushVersion(seeded, {
      label: "Before convert",
      createdAt: 20,
      text: "BBB",
    });
    assert.equal(next[0]?.text, "BBB");
    assert.equal(next[next.length - 1]?.id, WORDMARK_VERSION_ID);
    assert.equal(next[next.length - 1]?.pinned, true);
  });

  it("will not delete the pinned wordmark", () => {
    const seeded = ensurePinned([], wordmark);
    const gone = dropVersion(seeded, WORDMARK_VERSION_ID);
    assert.equal(gone.length, 1);
    assert.equal(gone[0]?.id, WORDMARK_VERSION_ID);
  });

  it("names downloads so they do not overwrite screensaver.txt", () => {
    assert.equal(versionFilename(0, true), "screensaver-omarchy.txt");
    assert.equal(
      versionFilename(Date.UTC(2026, 7, 28, 14, 43, 5)),
      "screensaver-20260828-144305.txt",
    );
  });

  it("round-trips JSON and ignores junk", () => {
    const list = pushVersion(ensurePinned([], wordmark), {
      id: "v1",
      label: "Saved",
      createdAt: 99,
      text: "hi",
    });
    const raw = serializeVersions(list);
    const back = parseVersions(raw);
    assert.equal(back.length, 2);
    assert.deepEqual(parseVersions("nope"), []);
    assert.deepEqual(parseVersions("[]"), []);
  });

  it("caps unpinned copies and still keeps the pin", () => {
    let list = ensurePinned([], wordmark);
    for (let i = 0; i < 30; i++) {
      list = pushVersion(list, {
        label: `v${i}`,
        createdAt: i,
        text: `art-${i}`,
      });
    }
    const pinned = list.filter((item) => item.pinned);
    const rest = list.filter((item) => !item.pinned);
    assert.equal(pinned.length, 1);
    assert.equal(rest.length, 24);
    assert.equal(rest[0]?.text, "art-29");
  });
});
