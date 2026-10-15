import { currentLight, subscribeLight, type DevicePose } from "./light";
import { STILL_POSE } from "./lightMode";
import { paperIrradiance } from "./roomIrradiance";
import { roomFrame, type RoomFrame } from "./sharedRoom";

/** The longest throw per unit of elevation, where the shoji nears the screen's horizon. */
const MAX_REACH = 1.5;
/** The shoji's height on screen upright, where its shadow is softest: the soft layer's blur is set for it. */
const UPRIGHT_LIGHT_Z = 0.556;
/** The sharp and soft mix moves in steps this size, so the tremor never repaints it. */
const MIX_STEP = 0.05;
/**
 * A shadow moves only once it would shift this far, in CSS px, at the highest elevation the stickers'
 * CSS gives (in hand), so a held device's tremor restyles nothing.
 */
const MOVE_PX = 0.25;
const HIGHEST_ELEVATION_PX = 14;

/** The shoji's share of the light on the screen's flat paper, all its key shadow takes away. */
const shojiShare = (frame: RoomFrame) => {
  const { shoji, total } = paperIrradiance(frame);
  return shoji / total;
};
const STILL_SHARE = shojiShare(roomFrame(STILL_POSE));
const step = (value: number) => (Math.round(value / MIX_STEP) * MIX_STEP).toFixed(2);

/**
 * The shoji's key shadow under a sticker lifted one unit, from the room's light in screen axes (y down,
 * z toward the viewer): its offset falls away from the light, and its penumbra, which grows as 1/L_z²,
 * is a mix of a sharp head-on blur and a soft upright one. Its strength is the shoji's share of the
 * screen's light against the still pose's, where the design sets its ink.
 */
export function keyShadow(pose: DevicePose) {
  const frame = roomFrame(pose);
  const [lx, ly, lz] = frame.light;
  const z = Math.max(lz, 1e-3);
  const reach = Math.hypot(lx, ly) / z;
  const k = reach > MAX_REACH ? MAX_REACH / reach : 1;
  const soft = Math.min(1, Math.max(0, (1 / z ** 2 - 1) / (1 / UPRIGHT_LIGHT_Z ** 2 - 1)));
  const strength = shojiShare(frame) / STILL_SHARE;
  return {
    x: (-lx / z) * k,
    y: (-ly / z) * k,
    sharp: strength * (1 - soft),
    soft: strength * soft,
  };
}

/**
 * Every mounted key shadow layer, written directly on each publish so the restyle stays inside them: the
 * offset every time, through `transform`, and the mix only when it crosses a step, since an opacity
 * change repaints the blur.
 */
const layers = new Set<HTMLElement>();
let shown = keyShadow(currentLight());
let stopFollowing: (() => void) | null = null;

function write(layer: HTMLElement, mixToo: boolean) {
  layer.style.setProperty("--key-shadow-x", shown.x.toFixed(3));
  layer.style.setProperty("--key-shadow-y", shown.y.toFixed(3));
  if (!mixToo) return;
  layer.style.setProperty("--key-shadow-sharp", step(shown.sharp));
  layer.style.setProperty("--key-shadow-soft", step(shown.soft));
}

function follow(pose: DevicePose) {
  const next = keyShadow(pose);
  const mixed = step(next.sharp) !== step(shown.sharp) || step(next.soft) !== step(shown.soft);
  const moved = Math.max(Math.abs(next.x - shown.x), Math.abs(next.y - shown.y));
  if (!mixed && moved * HIGHEST_ELEVATION_PX < MOVE_PX) return;
  shown = next;
  for (const layer of layers) write(layer, mixed);
}

/** A key shadow layer's ref: the layer follows the light while it's mounted. */
export function keyShadowLayer(layer: HTMLElement | null) {
  if (!layer) return;
  if (layers.size === 0) {
    shown = keyShadow(currentLight());
    stopFollowing = subscribeLight(follow);
  }
  layers.add(layer);
  write(layer, true);
  return () => {
    layers.delete(layer);
    if (layers.size > 0) return;
    stopFollowing?.();
    stopFollowing = null;
  };
}
