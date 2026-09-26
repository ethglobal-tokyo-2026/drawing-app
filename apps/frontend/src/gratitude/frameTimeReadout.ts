/** A readout of recent frame times, for measuring on a phone, where LINE's browser has no developer tools. */
export interface FrameTimeReadout {
  frame: (ms: number) => void;
  destroy: () => void;
}

/** The readout covers this much play. */
const SPAN_MS = 10_000;

export function createFrameTimeReadout(host: HTMLElement): FrameTimeReadout {
  const el = document.createElement("p");
  el.className = "gr-frames";
  el.setAttribute("aria-hidden", "true");
  host.append(el);
  const frames: { at: number; ms: number }[] = [];
  let clock = 0;
  let shownAt = -Infinity;
  return {
    frame(ms) {
      clock += ms;
      frames.push({ at: clock, ms });
      while (frames.length > 0 && clock - frames[0].at > SPAN_MS) frames.shift();
      if (clock - shownAt < 500) return;
      shownAt = clock;
      let worst = 0;
      let over20 = 0;
      let over34 = 0;
      for (const f of frames) {
        worst = Math.max(worst, f.ms);
        if (f.ms > 20) over20++;
        if (f.ms > 34) over34++;
      }
      const fps = (frames.length / Math.min(SPAN_MS, clock)) * 1000;
      el.textContent = `last 10s · worst ${worst.toFixed(0)}ms · ${over20} over 20ms · ${over34} over 34ms · ${fps.toFixed(0)} fps`;
    },
    destroy() {
      el.remove();
    },
  };
}
