// Generation must run without a DOM: in Node, in a Web Worker, and in the page.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const files = readdirSync(SRC, { recursive: true }).filter((f) => f.endsWith(".js"));
const DOM_GLOBALS = /\b(window|document|self|navigator|localStorage|HTMLElement|requestAnimationFrame)\b/;

test.each(files)("src/%s uses no DOM globals", (f) => {
  const code = readFileSync(join(SRC, f), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  expect(code).not.toMatch(DOM_GLOBALS);
});

test("the vitest environment really has no DOM", () => {
  expect(typeof document).toBe("undefined");
  expect(typeof window).toBe("undefined");
});
