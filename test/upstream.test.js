import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// upstream/index.html is the reference for the golden master and must never be edited.
const UPSTREAM_SHA256 =
  "4a0092eb7e4a44a2cc8abad4e90273fd35d50ebb5cbecf8c603a369bbbce0799";

test("upstream/index.html is untouched", () => {
  const bytes = readFileSync(new URL("../upstream/index.html", import.meta.url));
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(UPSTREAM_SHA256);
});
