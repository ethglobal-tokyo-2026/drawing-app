/**
 * The overhead window: its center and half extent on the plane one unit toward the viewer (y runs
 * down the screen), the width of its feathered edge, and its radiance. In the app, foil and paper both
 * mirror the shared room's ceiling light (ROOM.light in sharedRoom.ts): foil lights it at this
 * radiance, paper and laminate at a multiple of it. The window's own extent places only the foil e2e
 * fixture's sources.
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
