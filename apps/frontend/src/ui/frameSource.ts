/** Where frames and time come from: the browser's frames, or a test's hand-driven ones. */
export interface FrameSource {
  now: () => number;
  /** Asks for one frame; returns a function that withdraws the request. */
  request: (frame: (t: number) => void) => () => void;
}

export const browserFrames: FrameSource = {
  now: () => performance.now(),
  request(frame) {
    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  },
};
