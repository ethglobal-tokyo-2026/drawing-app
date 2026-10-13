import type { PostEvaluatorConfig, PostResponseConfig } from "./evaluator.ts";
import type { PostInputPacket } from "./input.ts";
import type { SourceConfiguration } from "./source.ts";

function freezeResponse(response: PostResponseConfig): Readonly<PostResponseConfig> {
  for (const curve of response.curves) {
    if (curve === null) continue;
    for (const point of curve) Object.freeze(point);
    Object.freeze(curve);
  }
  Object.freeze(response.curves);
  return Object.freeze(response);
}

/**
 * Selected ordinary round brush observed on 2026-10-11, not constructor defaults.
 * Provenance and the boundary between captured values and Croquis inputs:
 * docs/research/clip-studio-paint-stabilization/spikes/croquis-post-correction/profile.md.
 */
export const SELECTED_ROUND_BRUSH_PROFILE = Object.freeze({
  input: Object.freeze({
    tiltDegrees: 90,
    bearingDegrees: 0,
    rotationDegrees: 0,
    startupLength: 0,
    offset: Object.freeze({ x: 0, y: 0 }),
    angleSource: "none",
    reflect360: false,
    reflect180: false,
  } satisfies Pick<
    PostInputPacket,
    | "tiltDegrees"
    | "bearingDegrees"
    | "rotationDegrees"
    | "startupLength"
    | "offset"
    | "angleSource"
    | "reflect360"
    | "reflect180"
  >),
  movement: Object.freeze({ enabled: true, platform: 2, coordinateFactor: 1, documentRatio: 1 }),
  source: Object.freeze({
    deferFirstNode: false,
    fadeScalar54: null,
    cornerDetection: null,
  } satisfies SourceConfiguration),
  endpointSizeFactor: 0.5,
  evaluator: Object.freeze({
    main: freezeResponse({
      flags: 17,
      // Captured binary32 bits 0x3dcccccc; using 0.1 would round to different bits.
      minimum: 0.09999999403953552,
      input1Minimum: 0,
      input1Maximum: 1,
      input2Minimum: 0,
      randomMinimum: 0,
      input4Minimum: 0,
      curves: [
        [
          { x: 0, y: 0 },
          { x: 0.3, y: 0.5636363636363636 },
          { x: 0.6727272727272727, y: 0.9090909090909091 },
          { x: 1, y: 1 },
        ],
        null,
        null,
      ],
    }),
    secondary: freezeResponse({
      flags: 0,
      minimum: 0,
      input1Minimum: 0,
      input1Maximum: 1,
      input2Minimum: 0,
      randomMinimum: 0,
      input4Minimum: 0,
      curves: [null, null, null],
    }),
    secondaryEnabled: false,
    secondaryBase: 1,
    brushFlag4: false,
    adjustmentMode: 1,
  } satisfies PostEvaluatorConfig),
});
