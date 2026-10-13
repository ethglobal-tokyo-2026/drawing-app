import { TapRecognizer } from "../../../apps/frontend/src/sticker-creation/canvas/gestures.ts";

type Trace = { name: string; events: unknown[] };
const traces: Trace[] = [];

function run(name: string, play: (tap: TapRecognizer, events: unknown[]) => void) {
  const events: unknown[] = [];
  play(new TapRecognizer(), events);
  traces.push({ name, events });
}

run("young second finger, no live contact", (tap, out) => {
  out.push(tap.down(1, 0, 0, 0));
  out.push(tap.down(2, 50, 0, 100));
  out.push(tap.up(1, 150));
  out.push(tap.up(2, 160));
});

run("young second finger, provisional Fill supplied", (tap, out) => {
  out.push(tap.down(1, 0, 0, 0));
  out.push(tap.down(2, 50, 0, 100, { age: 100, moved: 0 }));
  out.push(tap.up(1, 150));
  out.push(tap.up(2, 160));
});

run("27 px Fill then second finger, no live contact", (tap, out) => {
  out.push(tap.down(1, 0, 0, 0));
  tap.move(1, 27, 0);
  out.push(tap.down(2, 50, 0, 100));
  out.push(tap.up(1, 150));
  out.push(tap.up(2, 160));
});

run("27 px Fill then second finger, accepted Fill supplied", (tap, out) => {
  out.push(tap.down(1, 0, 0, 0));
  tap.move(1, 27, 0);
  out.push(tap.down(2, 50, 0, 100, { age: 100, moved: 27 }));
  out.push(tap.up(1, 150));
  out.push(tap.up(2, 160));
});

run("stationary first finger, second at 261 ms", (tap, out) => {
  out.push(tap.down(1, 0, 0, 0));
  out.push(tap.down(2, 50, 0, 261, { age: 261, moved: 0 }));
  out.push(tap.up(1, 300));
  out.push(tap.up(2, 310));
});

run("three young fingers", (tap, out) => {
  out.push(tap.down(1, 0, 0, 0));
  out.push(tap.down(2, 50, 0, 20, { age: 20, moved: 0 }));
  out.push(tap.down(3, 100, 0, 40));
  out.push(tap.up(1, 100));
  out.push(tap.up(2, 110));
  out.push(tap.up(3, 120));
});

run("palm rests while two fingers tap", (tap, out) => {
  out.push(tap.down(9, 0, 0, 0, undefined, true));
  out.push(tap.down(1, 50, 0, 10));
  out.push(tap.down(2, 100, 0, 20, { age: 10, moved: 0 }));
  out.push(tap.up(1, 100));
  out.push(tap.up(2, 110));
  out.push(tap.up(9, 120));
});

run("third finger after accepted Fill and ignored second", (tap, out) => {
  out.push(tap.down(1, 0, 0, 0));
  tap.move(1, 27, 0);
  out.push(tap.down(2, 50, 0, 100, { age: 100, moved: 27 }));
  out.push(tap.down(3, 100, 0, 120, { age: 120, moved: 27 }));
  out.push(tap.up(1, 150));
  out.push(tap.up(2, 160));
  out.push(tap.up(3, 170));
});

const expected: Record<string, unknown[]> = {
  "young second finger, no live contact": ["draw", "gesture", null, "undo"],
  "young second finger, provisional Fill supplied": ["draw", "cancel-stroke", null, "undo"],
  "27 px Fill then second finger, no live contact": ["draw", "gesture", null, "undo"],
  "27 px Fill then second finger, accepted Fill supplied": ["draw", "ignore", null, null],
  "stationary first finger, second at 261 ms": ["draw", "draw", null, null],
  "three young fingers": ["draw", "cancel-stroke", "gesture", null, null, "redo"],
  "palm rests while two fingers tap": ["ignore", "draw", "cancel-stroke", null, "undo", null],
  "third finger after accepted Fill and ignored second": [
    "draw",
    "ignore",
    "ignore",
    null,
    null,
    null,
  ],
};

for (const trace of traces) {
  console.log(JSON.stringify(trace));
  if (JSON.stringify(trace.events) !== JSON.stringify(expected[trace.name])) {
    throw new Error(`Unexpected recognizer result: ${trace.name}`);
  }
}
