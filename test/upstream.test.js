import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// upstream/index.html is the reference for the golden master and must never be edited.
// Hash of the file with LF line endings (CRLF is normalised first, in case a checkout
// converted them; line endings do not change what the page generates).
const UPSTREAM_SHA256 =
  "858792db2659e7d4c6604606d4ff2175f137f07061f8af51644f06ab0788215f";

test("upstream/index.html is untouched", () => {
  const text = readFileSync(new URL("../upstream/index.html", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  expect(createHash("sha256").update(text).digest("hex")).toBe(UPSTREAM_SHA256);
});
