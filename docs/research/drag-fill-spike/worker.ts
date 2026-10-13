import {
  findFill,
  recordFill,
  writeFill,
} from "../../../apps/frontend/src/sticker-creation/canvas/fill";

// Research-only transport around the unmodified product algorithm.
self.onmessage = ({ data: request }) => {
  const { id, shown, target, sx, sy, color, gap, cut, at, locked } = request;
  const started = performance.now();
  try {
    const found = findFill(shown, sx, sy, color, gap, cut);
    const searched = performance.now();
    if (!found || found === "past") {
      self.postMessage({
        id,
        kind: found === "past" ? "past" : "empty",
        workerMs: searched - started,
      });
      return;
    }
    const changed = writeFill(target, shown, found, color, locked);
    const written = changed ? recordFill(target, at, found) : null;
    const spans: number[] = [];
    for (let y = 0; y < found.box.h; y++) {
      for (let x = 0; x < found.box.w;) {
        if (found.marks[y * found.box.w + x] !== 1) {
          x++;
          continue;
        }
        const x0 = x;
        while (x < found.box.w && found.marks[y * found.box.w + x] === 1) x++;
        spans.push(at.y + found.box.y + y, at.x + found.box.x + x0, at.x + found.box.x + x);
      }
    }
    const interior = Uint32Array.from(spans);
    const result = {
      id,
      kind: "found",
      target,
      found,
      written,
      interior,
      searchMs: searched - started,
      workerMs: performance.now() - started,
    };
    const transfers = new Set<ArrayBuffer>([
      target.data.buffer,
      found.marks.buffer,
      interior.buffer,
    ]);
    if (written) {
      transfers.add(written.spans.buffer);
      transfers.add(written.colors.buffer);
    }
    self.postMessage(result, [...transfers]);
  } catch (error) {
    self.postMessage({
      id,
      kind: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
