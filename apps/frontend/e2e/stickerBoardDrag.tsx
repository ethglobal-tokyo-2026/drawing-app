import { Fragment, useCallback, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { PlacedSticker } from "../src/sticker-board/PlacedSticker";
import { useStickerStack } from "../src/sticker-board/useStickerStack";
import { fieldOf, stickerBox, type Placement } from "../src/sticker-board/placement";
import { KeepAnimations } from "../src/sticker-board/keepAnimations";
import { StickerToolbar } from "../src/sticker-board/StickerToolbar";
import { orderOn } from "../src/sticker-board/stickerOrder";
import { testBoardSticker } from "../src/sticker-board/testBoardSticker";
import { CreasesContext, useCreases } from "../src/sticker-board/useCreases";
import { useBoardGestures } from "../src/sticker-board/useBoardGestures";
import { acquireLight, currentLight, installLight } from "../src/stickers/light";
import { askForMotion } from "../src/ui/motionPermission";
import { formatNo } from "../src/stickers/format";
import { whenLaminateSettled } from "../src/stickers/laminateRenderer";
import {
  clearPerformanceRecording,
  isPerformanceRecorderOn,
  notePerformance,
  readPerformanceRecording,
  startPerformanceRecorder,
  stopPerformanceRecorder,
  watchFrames,
} from "../src/performance/performanceRecorder";
import { readCurrentReport } from "../src/performance/currentReport";
import "../src/styles/tokens.css";
import "../src/sticker-board/StickerBoard.css";

const variant = new URLSearchParams(location.search).get("variant");
if (variant !== null && variant !== "ipad-21")
  throw new Error(`Unknown large sticker board fixture variant: ${variant}`);
const stickerCount = variant === "ipad-21" ? 21 : 15;
const size = variant === "ipad-21" ? { W: 1200, H: 1454, U: 1200 } : { W: 1032, H: 1376, U: 1032 };
const field = fieldOf(size.W, size.H);
const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">${body}</svg>`)}`;
// Distinct source images and cuts exercise decode/texture ownership, not a shared tiny image.
const sources = Array.from({ length: stickerCount }, (_, index) => {
  const central = index < 5;
  const placement: Placement = central
    ? {
        on: true,
        x: 0.43 + index * 0.035,
        y: 0.43 + index * 0.055,
        s: 0.5 + index * 0.025,
        r: index * 3 - 6,
        z: index,
      }
    : {
        on: true,
        x: index % 2 ? 0.16 : 0.84,
        y:
          variant === "ipad-21"
            ? 0.12 + Math.floor((index - 5) / 2) * 0.105
            : 0.14 + Math.floor((index - 5) / 2) * 0.16,
        s: 0.16 + (index % 3) * 0.02,
        r: index * 7,
        z: index,
      };
  return testBoardSticker({
    id: `large-drag-${index}`,
    no: index + 1,
    width: 600,
    height: 600,
    kyotoSeikaSubjects: [
      { ja: "風", reading: "かぜ", en: "wind" },
      { ja: "再会", reading: "さいかい", en: "reunion" },
    ],
    urls: {
      png: svg(
        `<rect width="600" height="600" fill="white"/><path d="M${60 + index} 180Q300 ${35 + index * 6} 540 180V420Q300 530 60 420Z" stroke="#181818" stroke-width="${4 + (index % 3)}" fill="none"/><path d="M100 280H500M100 350H500M300 160V450" stroke="#181818" stroke-width="4"/><rect x="${85 + index * 3}" y="320" width="${100 + index * 5}" height="80" fill="${index % 3 ? "#888888" : "#dd498c"}"/>`,
      ),
      mask: svg(`<rect x="3" y="3" width="594" height="594" rx="${24 + index}" fill="white"/>`),
    },
    placement,
    placements: { phone: placement, large: placement },
  });
});

type Phase =
  | "asset-preparation"
  | "startup"
  | "idle"
  | "pointerdown"
  | "first-move"
  | "drag"
  | "release"
  | "steady-tilt"
  | "stationary-hold";
const rememberedCanvases = new Map<string, HTMLCanvasElement>();
const materialCanvases = () => [
  ...document.querySelectorAll<HTMLCanvasElement>(".placed-sticker canvas.sticker-laminate"),
];
const diagnostics = {
  variant,
  stickerCount,
  phase: "asset-preparation" as Phase,
  displayFrame: 0,
  frames: [] as { phase: Phase; interval: number }[],
  events: [] as { phase: Phase; type: string; duration: number }[],
  mutations: [] as { phase: Phase; count: number }[],
  creaseReveals: [] as Phase[],
  missingSnapshots: [] as { phase: Phase; sticker: string | undefined }[],
  incompleteBoards: [] as { phase: Phase; count: number }[],
  materialCopies: [] as { phase: Phase; frame: number; id: string }[],
  setPhase(phase: Phase) {
    this.phase = phase;
    performance.mark(`large-board-${phase}`);
    notePerformance("sticker board drag phase", phase);
  },
  recorderOn: isPerformanceRecorderOn,
  askForMotion,
  getPose: currentLight,
  tilt(beta: number, gamma: number, alpha = 123) {
    const started = performance.now();
    window.dispatchEvent(Object.assign(new Event("deviceorientation"), { alpha, beta, gamma }));
    return performance.now() - started;
  },
  rememberCanvases() {
    rememberedCanvases.clear();
    for (const canvas of materialCanvases()) {
      const id = canvas.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId;
      if (!id) throw new Error("A material canvas has no sticker identifier");
      rememberedCanvases.set(id, canvas);
    }
    return rememberedCanvases.size;
  },
  retainedCanvases() {
    const canvases = materialCanvases();
    return (
      canvases.length === rememberedCanvases.size &&
      canvases.every((canvas) => {
        const id = canvas.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId;
        return id !== undefined && rememberedCanvases.get(id) === canvas;
      })
    );
  },
  normals(): Record<string, string | null> {
    throw new Error("The large sticker board has not planned its creases");
  },
  finishRecorder() {
    this.setPhase("idle");
    const wasOn = isPerformanceRecorderOn();
    notePerformance("diagnostic", "Capturing the recorder after measured input has ended");
    stopPerformanceRecorder();
    const recording = readPerformanceRecording();
    return {
      wasOn,
      isOn: isPerformanceRecorderOn(),
      recording: recording && {
        ...recording,
        summary: {
          ...recording.summary,
          byScreen: Object.fromEntries(recording.summary.byScreen),
          pointers: Object.fromEntries(recording.summary.pointers),
        },
      },
      report: readCurrentReport(),
    };
  },
  async whenMaterialsSettled(): Promise<void> {
    throw new Error("The large sticker board has not mounted");
  },
};
declare global {
  interface Window {
    stickerBoardDragFixture: typeof diagnostics;
  }
}
window.stickerBoardDragFixture = diagnostics;
let last = performance.now();
const recordFrame = (now: number) => {
  diagnostics.displayFrame++;
  if (diagnostics.phase !== "idle")
    diagnostics.frames.push({ phase: diagnostics.phase, interval: now - last });
  if (
    diagnostics.phase !== "idle" &&
    diagnostics.phase !== "startup" &&
    diagnostics.phase !== "asset-preparation"
  ) {
    const canvases = materialCanvases();
    if (canvases.length !== stickerCount)
      diagnostics.incompleteBoards.push({ phase: diagnostics.phase, count: canvases.length });
    for (const canvas of canvases) {
      if (canvas.dataset.state !== "ready" || !canvas.width || !canvas.height)
        diagnostics.missingSnapshots.push({
          phase: diagnostics.phase,
          sticker: canvas.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId,
        });
    }
  }
  last = now;
  requestAnimationFrame(recordFrame);
};
requestAnimationFrame(recordFrame);
// Count actual retained-material copies, without GPU pixel readback or measured input handlers.
const copyImage: unknown = Reflect.get(CanvasRenderingContext2D.prototype, "drawImage");
if (typeof copyImage !== "function") throw new Error("The native canvas copy method is missing");
Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
  configurable: true,
  value: function (this: CanvasRenderingContext2D, ...args: unknown[]) {
    Reflect.apply(copyImage, this, args);
    if (
      (diagnostics.phase === "steady-tilt" || diagnostics.phase === "stationary-hold") &&
      this.canvas.classList.contains("sticker-laminate")
    ) {
      const id = this.canvas.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId;
      if (!id) throw new Error("A copied laminate has no sticker identifier");
      diagnostics.materialCopies.push({
        phase: diagnostics.phase,
        frame: diagnostics.displayFrame,
        id,
      });
    }
  },
});
const eventStarts = new WeakMap<Event, number>();
for (const type of ["pointerdown", "pointermove", "pointerup"]) {
  document.addEventListener(type, (event) => eventStarts.set(event, performance.now()), true);
  document.addEventListener(type, (event) => {
    const started = eventStarts.get(event);
    if (started !== undefined)
      diagnostics.events.push({
        phase: diagnostics.phase,
        type,
        duration: performance.now() - started,
      });
  });
}
const root = document.getElementById("root");
if (!root) throw new Error("The large sticker drag fixture root is missing");
new MutationObserver((changes) => {
  if (diagnostics.phase !== "idle")
    diagnostics.mutations.push({ phase: diagnostics.phase, count: changes.length });
  for (const change of changes)
    if (
      change.attributeName === "data-crease-reveal" &&
      change.target instanceof HTMLElement &&
      change.target.hasAttribute("data-crease-reveal")
    )
      diagnostics.creaseReveals.push(diagnostics.phase);
}).observe(root, { attributes: true, childList: true, subtree: true });

document.body.style.cssText = "margin:0;background:#d9d7d1";
const uninstall = installLight(document.documentElement);
const releaseLight = acquireLight();
const assetUrls: string[] = [];
window.addEventListener(
  "pagehide",
  () => {
    releaseLight();
    uninstall();
    stopPerformanceRecorder();
    for (const url of assetUrls) URL.revokeObjectURL(url);
  },
  { once: true },
);

/** The worker receives actual PNG assets; SVG generation belongs to fixture preparation only. */
async function pngAsset(
  source: string,
  stickerId: string,
  kind: string,
  signal: AbortSignal,
): Promise<string> {
  const bounded = async <T,>(work: Promise<T>): Promise<T> => {
    let abort!: () => void;
    try {
      return await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          abort = () =>
            reject(
              new Error(
                `Preparing ${stickerId}'s ${kind} image exceeded the 20-second fixture deadline`,
              ),
            );
          if (signal.aborted) abort();
          else signal.addEventListener("abort", abort, { once: true });
        }),
      ]);
    } finally {
      signal.removeEventListener("abort", abort);
    }
  };
  const image = new Image();
  image.src = source;
  await bounded(image.decode());
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 600;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error(`Preparing ${stickerId}'s ${kind} image has no canvas context`);
    context.drawImage(image, 0, 0);
    const blob = await bounded(
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error(`Encoding ${stickerId}'s ${kind} image as PNG failed`)),
          "image/png",
        );
      }),
    );
    const url = URL.createObjectURL(blob);
    assetUrls.push(url);
    return url;
  } finally {
    canvas.width = canvas.height = 0;
  }
}
const initial: typeof sources = [];
try {
  const signal = AbortSignal.timeout(20_000);
  for (const sticker of sources) {
    const png = await pngAsset(sticker.urls.png, sticker.id, "print", signal);
    const mask = await pngAsset(sticker.urls.mask, sticker.id, "cut", signal);
    initial.push({ ...sticker, urls: { png, mask } });
  }
} catch (error) {
  const failure = `Preparing the large sticker board's bitmap assets failed: ${String(error)}`;
  const root = document.getElementById("root");
  if (root) {
    root.textContent = failure;
    root.dataset.assetError = failure;
  }
  console.error(failure);
  throw error;
}
diagnostics.setPhase("startup");
if (new URLSearchParams(location.search).get("recorder") === "on") {
  clearPerformanceRecording();
  startPerformanceRecorder();
  notePerformance("fixture", "Bitmap asset preparation completed before recorder startup");
  watchFrames("Large sticker board material assembly and drag", performance.now(), 20_000);
}

export function Board() {
  const stage = useRef<HTMLDivElement>(null);
  const tray = useRef(null);
  const [stickers, setStickers] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [placementGeneration, setPlacementGeneration] = useState(0);
  const place = (id: string, placement: Placement) =>
    setStickers((list) =>
      list.map((sticker) => (sticker.id === id ? { ...sticker, placement } : sticker)),
    );
  const select = (id: string | null) => {
    setSelected(id);
    if (!id) return;
    const sticker = stickers.find((candidate) => candidate.id === id);
    const z =
      Math.max(
        ...stickers
          .filter((candidate) => candidate.id !== id)
          .map((candidate) => candidate.placement.z),
      ) + 1;
    if (sticker && sticker.placement.z < z) place(id, { ...sticker.placement, z });
  };
  const { hold, stow, arrange } = useBoardGestures({
    stage,
    tray,
    stickers,
    field,
    size,
    layout: "large",
    selected,
    reduced: false,
    onSelect: select,
    onOpen: () => {},
    onCommit: (id, placement) => {
      flushSync(() => {
        place(id, placement);
        setPlacementGeneration((generation) => generation + 1);
      });
    },
    onRemove: () => {},
  });
  const sorted = stickers.toSorted((a, b) => a.placement.z - b.placement.z);
  const order = orderOn(stickers, field);
  const byId = new Map(stickers.map((sticker) => [sticker.id, sticker]));
  const inOrder = order.flatMap((id) => byId.get(id) ?? []);
  const stack = new Map(sorted.map((sticker, index) => [sticker.id, index]));
  useStickerStack(stage, stack);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const crease = useCreases({
    stickers: sorted,
    field,
    unit: size.U,
    foilOf: () => "kyoto-seika",
    held: hold?.id,
    placementGeneration,
  });
  useLayoutEffect(() => {
    diagnostics.normals = () =>
      Object.fromEntries(initial.map(({ id }) => [id, crease.creaseOf(id)?.normal ?? null]));
    diagnostics.whenMaterialsSettled = async () => {
      const signal = AbortSignal.timeout(20_000);
      await crease.whenSettled(signal);
      await new Promise<number>(requestAnimationFrame);
      await Promise.all(
        [
          ...(stage.current?.querySelectorAll<HTMLCanvasElement>("canvas.sticker-laminate") ?? []),
        ].map((canvas) => {
          const id = canvas.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId;
          return whenLaminateSettled(
            canvas,
            { normal: id ? crease.creaseOf(id)?.normal : undefined },
            signal,
          );
        }),
      );
      if (signal.aborted)
        throw new Error("The large sticker board did not finish material assembly in 20 seconds");
    };
  }, [crease]);
  const landed = useCallback(() => {}, []);
  useLayoutEffect(() => {
    if (stage.current) {
      stage.current.dataset.selected = selected ?? "";
      stage.current.dataset.held = hold?.id ?? "";
    }
  }, [selected, hold]);
  return (
    <div
      ref={stage}
      className="board-stage"
      style={{ position: "relative", width: size.W, height: size.H }}
    >
      <CreasesContext value={crease}>
        <KeepAnimations order={order.join(" ")} root={stage}>
          {inOrder.map((sticker, index) => (
            <Fragment key={sticker.id}>
              <PlacedSticker
                sticker={sticker}
                field={field}
                unit={size.U}
                selected={selected === sticker.id}
                knobBelow={false}
                inHand={hold?.id === sticker.id ? hold.kind : undefined}
                landing={false}
                onLanded={landed}
                reduced={false}
                tabbable={index === 0}
                position={index + 1}
                setSize={stickers.length}
                hintId="drag-review"
              />
              {selected === sticker.id && !hold && (
                <StickerToolbar
                  label={formatNo(sticker.no)}
                  sticker={{
                    ...stickerBox(field, size.U, sticker.placement, sticker),
                    r: sticker.placement.r,
                  }}
                  board={size}
                  knobBelow={false}
                  clearOf={null}
                  onView={() => {}}
                  onRemove={() => stow(sticker.id)}
                  arrange={{
                    open: arrangeOpen,
                    onOpen: setArrangeOpen,
                    onStep: (step) => arrange(sticker.id, step),
                  }}
                  onEscape={() =>
                    stage.current
                      ?.querySelector<HTMLElement>(`[data-sticker-id="${sticker.id}"]`)
                      ?.focus()
                  }
                  reduced={false}
                />
              )}
            </Fragment>
          ))}
        </KeepAnimations>
      </CreasesContext>
    </div>
  );
}
createRoot(root).render(<Board />);
