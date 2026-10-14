import { stickerFoilCoverage, stickerTurn } from "../src/stickers/stickerRenderer";
import { currentLight } from "../src/stickers/light";
import { getMotionPermission } from "../src/ui/motionPermission";
import { registeredPaperAlpha, required } from "./stickerMaterialFixture";

/** Each evidence target must actually have a worker-produced crease; holo also owns the overflow. */
export function actualFoilTargets() {
  const creases = window.stickerBoardDragFixture.acceptedCreases();
  const canvases = [
    ...document.querySelectorAll<HTMLCanvasElement>(".placed-sticker canvas.sticker-material"),
  ];
  return (["kyoto-seika", "holo", "pink"] as const).map((style) =>
    required(
      canvases.find((canvas) => {
        const id = canvas.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId;
        return (
          id &&
          creases[id] &&
          stickerFoilCoverage(canvas)?.material.style === style &&
          (style !== "holo" || id === "large-drag-1")
        );
      }),
    ),
  );
}

/** Read only opaque, fully exposed registered foil, excluding a one-source-pixel paper fringe. */
export async function foilBandEvidence() {
  const fixture = window.stickerBoardDragFixture;
  await fixture.askForMotion();
  fixture.tilt(0, 0);
  const rows = await Promise.all(
    actualFoilTargets().map(async (canvas) => {
      const id = required(canvas.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId);
      const context = required(canvas.getContext("2d"));
      const description = required(stickerFoilCoverage(canvas));
      const c = description.coverage;
      const paper = await registeredPaperAlpha(canvas);
      const initial = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const crease = required(fixture.acceptedCreases()[id]);
      const bounds = crease.normalBounds ?? { x: 0, y: 0, width: 1, height: 1 };
      const response = await fetch(crease.normal, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Reading ${id} worker normal answered ${response.status}`);
      const bitmap = await createImageBitmap(await response.blob());
      const normalCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const normalContext = required(normalCanvas.getContext("2d"));
      normalContext.drawImage(bitmap, 0, 0);
      const normal = normalContext.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const normalSize = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      normalCanvas.width = normalCanvas.height = 0;
      const eligible: { at: number }[] = [];
      const outsidePixels: { at: number; bent: boolean }[] = [];
      const radius = Math.ceil(Math.max(canvas.width / c.width, canvas.height / c.height));
      for (let y = 0; y < canvas.height; y++)
        for (let x = 0; x < canvas.width; x++) {
          const at = (y * canvas.width + x) * 4;
          const sourceU = (c.x + ((x + 0.5) * c.width) / canvas.width) / c.sourceWidth;
          const sourceV = (c.y + ((y + 0.5) * c.height) / canvas.height) / c.sourceHeight;
          if (
            initial[at + 3] > 0 &&
            paper[at + 3] === 0 &&
            (sourceU < 0 || sourceU > 1 || sourceV < 0 || sourceV > 1)
          ) {
            const nx = Math.floor(((sourceU - bounds.x) / bounds.width) * normalSize.width);
            const ny = Math.floor(((sourceV - bounds.y) / bounds.height) * normalSize.height);
            if (nx < 0 || nx >= normalSize.width || ny < 0 || ny >= normalSize.height)
              throw new Error("Outside foil escaped its accepted worker normal");
            const n = (ny * normalSize.width + nx) * 4;
            outsidePixels.push({
              at,
              bent: Math.abs(normal[n] - 128) > 2 || Math.abs(normal[n + 1] - 128) > 2,
            });
          }
          if (initial[at + 3] !== 255 || paper[at + 3] !== 0) continue;
          let clear = true;
          for (let dy = -radius; dy <= radius && clear; dy++)
            for (let dx = -radius; dx <= radius; dx++) {
              const px = x + dx,
                py = y + dy;
              if (
                px >= 0 &&
                px < canvas.width &&
                py >= 0 &&
                py < canvas.height &&
                paper[(py * canvas.width + px) * 4 + 3] !== 0
              ) {
                clear = false;
                break;
              }
            }
          if (!clear) continue;
          const outerX = ((x + 0.5) * c.width) / canvas.width;
          const outerY = ((y + 0.5) * c.height) / canvas.height;
          const ox = Math.floor(outerX - 0.5),
            oy = Math.floor(outerY - 0.5);
          // All four source samples must be opaque; fractional outer-edge tint is ineligible.
          if (
            ![0, 1].every((dy) =>
              [0, 1].every((dx) => {
                const px = Math.max(0, Math.min(c.width - 1, ox + dx));
                const py = Math.max(0, Math.min(c.height - 1, oy + dy));
                return c.alpha.at(py * c.width + px) === 255;
              }),
            )
          )
            continue;
          const u = (c.x + outerX) / c.sourceWidth,
            v = (c.y + outerY) / c.sourceHeight;
          const nx = Math.floor(((u - bounds.x) / bounds.width) * normalSize.width);
          const ny = Math.floor(((v - bounds.y) / bounds.height) * normalSize.height);
          if (nx < 0 || nx >= normalSize.width || ny < 0 || ny >= normalSize.height)
            throw new Error("Registered foil escaped its accepted worker normal");
          eligible.push({ at });
        }
      return {
        canvas,
        context,
        initial,
        eligible,
        outsidePixels,
        id,
        style: description.material.style,
        turn: required(stickerTurn(canvas)),
        coverage: {
          x: c.x,
          y: c.y,
          width: c.width,
          height: c.height,
          sourceWidth: c.sourceWidth,
          sourceHeight: c.sourceHeight,
        },
        normal: { bounds, ...normalSize },
        samples: [] as {
          axis: string;
          target: number;
          pose: ReturnType<typeof currentLight>;
          eligible: number;
          chromatic: number;
          green: number;
          maxSpread: number;
          strongestPixel: { x: number; y: number; rgb: number[] };
          outside: number;
          outsideBent: number;
          outsideDifference: number;
        }[],
        strongest: { spread: -1, image: "", sample: -1 },
      };
    }),
  );
  const angle = (pose: number) => {
    let low = -1,
      high = 1;
    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2;
      if (1.5 * mid - 0.5 * mid ** 3 < pose) low = mid;
      else high = mid;
    }
    return (32 * (low + high)) / 2;
  };
  for (const axis of ["x", "y"] as const)
    for (const target of [
      0, 0.15, 0.3, 0.45, 0.6, 0.45, 0.3, 0.15, 0, -0.15, -0.3, -0.45, -0.6, -0.45, -0.3, -0.15, 0,
    ]) {
      fixture.tilt(axis === "y" ? angle(target) : 0, axis === "x" ? angle(target) : 0);
      const deadline = performance.now() + 2000;
      while (Math.abs(currentLight()[axis] - target) > 1e-6) {
        if (performance.now() > deadline)
          throw new Error(
            `Shared ${axis} pose did not settle at ${target}: ${JSON.stringify({ pose: currentLight(), fixturePose: fixture.getPose(), permission: getMotionPermission(), visibility: document.visibilityState, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, ua: navigator.userAgent })}`,
          );
        await new Promise<number>(requestAnimationFrame);
      }
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      for (const row of rows) {
        const pixels = row.context.getImageData(0, 0, row.canvas.width, row.canvas.height).data;
        let chromatic = 0,
          green = 0,
          maxSpread = -1,
          outside = 0,
          outsideBent = 0,
          outsideDifference = 0;
        let strongestPixel = { x: 0, y: 0, rgb: [] as number[] };
        for (const { at } of row.eligible) {
          if (pixels[at + 3] !== 255)
            throw new Error("Shared pose changed opaque registered foil alpha");
          const rgb = [pixels[at], pixels[at + 1], pixels[at + 2]];
          const spread = (Math.max(...rgb) - Math.min(...rgb)) / 255;
          if (spread > 0.08) chromatic++;
          if (rgb[1] > rgb[0] + 2 && rgb[1] > rgb[2] + 2) green++;
          if (spread > maxSpread) {
            maxSpread = spread;
            strongestPixel = {
              x: (at / 4) % row.canvas.width,
              y: Math.floor(at / 4 / row.canvas.width),
              rgb,
            };
          }
        }
        for (const { at, bent } of row.outsidePixels) {
          if (pixels[at + 3] !== row.initial[at + 3])
            throw new Error("Shared pose changed outside-source foil alpha");
          outside++;
          if (bent) outsideBent++;
          for (let channel = 0; channel < 3; channel++)
            outsideDifference += Math.abs(pixels[at + channel] - row.initial[at + channel]);
        }
        row.samples.push({
          axis,
          target,
          pose: currentLight(),
          eligible: row.eligible.length,
          chromatic,
          green,
          maxSpread,
          strongestPixel,
          outside,
          outsideBent,
          outsideDifference,
        });
        if (maxSpread > row.strongest.spread)
          row.strongest = {
            spread: maxSpread,
            image: row.canvas.toDataURL(),
            sample: row.samples.length - 1,
          };
      }
    }
  return rows.map(
    ({ canvas, context, initial, eligible: _eligible, outsidePixels: _outsidePixels, ...row }) => ({
      ...row,
      returned: context
        .getImageData(0, 0, canvas.width, canvas.height)
        .data.every((v, i) => v === initial[i]),
      returnedImage: canvas.toDataURL(),
    }),
  );
}
