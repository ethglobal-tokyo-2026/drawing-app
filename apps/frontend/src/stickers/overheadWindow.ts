/**
 * The overhead window that paper and foil both mirror: its center and half extent on the plane one
 * unit toward the viewer (y runs down the screen), the width of its feathered edge, and its radiance.
 * Foil lights it at the paper's radiance, so their highlights line up.
 */
export const OVERHEAD_WINDOW: OverheadWindow = {
  x: 0.02,
  y: -0.025,
  halfWidth: 0.1,
  halfHeight: 0.145,
  feather: 0.015,
  radiance: 3.06,
};

export interface OverheadWindow {
  readonly x: number;
  readonly y: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly feather: number;
  readonly radiance: number;
}
