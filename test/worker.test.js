// Generation runs off the main thread. A Node worker thread has no window, document or
// page globals, so this catches any hidden dependency on them. (A browser Web Worker is
// added with the worker itself in Phase 2.)
import { Worker } from "node:worker_threads";
import { expect, test } from "vitest";
import { replay } from "./support/replay.js";

const WORKER = `
  import { parentPort, workerData } from "node:worker_threads";
  const { replay } = await import(workerData.replayUrl);
  const w = replay(workerData.seed, [600]);
  parentPort.postMessage(w.MEM.chunks.map((c) => c.canv).join("\\n"));
`;

test("a worker thread generates the same world as the main thread", async () => {
  const replayUrl = new URL("./support/replay.js", import.meta.url).href;
  const fromWorker = await new Promise((resolve, reject) => {
    const w = new Worker(new URL(`data:text/javascript,${encodeURIComponent(WORKER)}`), {
      workerData: { seed: "42", replayUrl },
    });
    w.once("message", resolve);
    w.once("error", reject);
  });
  const fromMain = replay("42", [600]).MEM.chunks.map((c) => c.canv).join("\n");
  expect(fromWorker.length).toBeGreaterThan(1000);
  expect(fromWorker).toBe(fromMain);
});
