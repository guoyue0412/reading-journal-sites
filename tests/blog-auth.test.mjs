import assert from "node:assert/strict";
import test from "node:test";
import { isBlogOwner } from "../app/chatgpt-auth.ts";

test("owner email comparison is exact after lowercase normalization", () => {
  assert.equal(isBlogOwner("Guo@example.com", "guo@example.com"), true);
  assert.equal(isBlogOwner(" other@example.com ", "guo@example.com"), false);
  assert.equal(isBlogOwner("", "guo@example.com"), false);
  assert.equal(isBlogOwner("guo@example.com", undefined), false);
  assert.equal(isBlogOwner("", "   "), false);
});
