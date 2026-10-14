import { acquireFoilCoverage, FOIL_COVERAGE_TIMEOUT_MS } from "./acquireFoilCoverage";
import type { StickerFoilMaterial } from "./stickerFoilMaterial";
import type { StickerFoilCoverage } from "./stickerRenderer";

/** Static fallback and cast preparation, shared by React figures and imperative tray presentations. */
export function prepareStickerFoil(
  element: HTMLElement,
  material: StickerFoilMaterial,
  cut: string,
  active: () => boolean,
) {
  // Each holds its share of the coverage: the shown one's mask must outlive any replacement attempt.
  let pending: { size: string; abort: AbortController; release: () => void } | undefined;
  let shown:
    | { size: string; coverage: StickerFoilCoverage["coverage"]; release: () => void }
    | undefined;
  const stopPending = () => {
    const request = pending;
    pending = undefined;
    request?.abort.abort();
    request?.release();
  };
  const shownSize = (width: number, height: number) => {
    const style = getComputedStyle(element);
    return [parseFloat(style.width) || width, parseFloat(style.height) || height] as const;
  };
  const prepare = () => {
    if (!active() || document.hidden || !element.isConnected) return;
    const box = element.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) return;
    const width = element.clientWidth,
      height = element.clientHeight;
    if (!width || !height) return;
    const size = `${width},${height}`;
    if (pending?.size === size) return;
    if (shown?.size === size) {
      stopPending();
      applyPrintRegistration(element, shown.coverage, ...shownSize(width, height));
      return;
    }
    stopPending();
    const abort = new AbortController();
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(FOIL_COVERAGE_TIMEOUT_MS)]);
    const acquired = acquireFoilCoverage(cut, material, width, height, signal);
    const request = { size, abort, release: acquired.release };
    pending = request;
    const failed = (error: unknown) => {
      // A cast already shown stays: it is the sticker's only shadow and cut line. Exposure retries.
      element.dataset.error = `Preparing static ${material.style} foil for ${cut} failed: ${String(error)}`;
      if (!shown) element.dataset.state = "failed";
      console.error(element.dataset.error);
    };
    acquired.coverage.then(
      (coverage) => {
        if (pending !== request) return;
        pending = undefined;
        try {
          applyStickerFoilCoverage(element, coverage, ...shownSize(width, height));
        } catch (error) {
          acquired.release();
          failed(error);
          return;
        }
        shown?.release();
        shown = { size, coverage, release: acquired.release };
      },
      (error: unknown) => {
        // A superseded or stopped request was released by whatever replaced it.
        if (pending !== request) return;
        pending = undefined;
        acquired.release();
        failed(error);
      },
    );
  };
  const observer = new ResizeObserver(prepare);
  observer.observe(element);
  const entered = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) prepare();
    else stopPending();
  });
  entered.observe(element);
  const visibility = () => {
    if (document.hidden) stopPending();
    else prepare();
  };
  document.addEventListener("visibilitychange", visibility);
  prepare();
  return () => {
    observer.disconnect();
    entered.disconnect();
    stopPending();
    shown?.release();
    shown = undefined;
    document.removeEventListener("visibilitychange", visibility);
  };
}

/** Show a committed coverage's mask, registered to its source frame, for static and copied casts. */
export function applyStickerFoilCoverage(
  element: HTMLElement,
  coverage: StickerFoilCoverage["coverage"],
  shownWidth: number,
  shownHeight: number,
) {
  element.style.setProperty("--foil-coverage", `url("${coverage.mask}")`);
  element.style.setProperty("--foil-left", `${(100 * coverage.x) / coverage.sourceWidth}%`);
  element.style.setProperty("--foil-top", `${(100 * coverage.y) / coverage.sourceHeight}%`);
  element.style.setProperty("--foil-width", `${(100 * coverage.width) / coverage.sourceWidth}%`);
  element.style.setProperty("--foil-height", `${(100 * coverage.height) / coverage.sourceHeight}%`);
  applyPrintRegistration(element, coverage, shownWidth, shownHeight);
  element.dataset.state = "ready";
  delete element.dataset.error;
}

/** Fractional presentation size changes print pitch/origin without rebuilding integer coverage. */
function applyPrintRegistration(
  element: HTMLElement,
  coverage: StickerFoilCoverage["coverage"],
  shownWidth: number,
  shownHeight: number,
) {
  // The shader's screentone: 80 tiles across the short side, never under 3 CSS px.
  const pitch = Math.max(3, Math.min(shownWidth, shownHeight) / 80);
  element.style.setProperty("--foil-print-pitch", `${pitch}px ${pitch}px`);
  element.style.setProperty(
    "--foil-print-x",
    `${(-shownWidth * coverage.x) / coverage.sourceWidth}px`,
  );
  element.style.setProperty(
    "--foil-print-y",
    `${(-shownHeight * coverage.y) / coverage.sourceHeight}px`,
  );
}
