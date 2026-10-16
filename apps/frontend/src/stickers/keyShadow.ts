import { currentLight, subscribeLight, type DevicePose } from "./light";
import { STILL_POSE } from "./lightMode";
import { overLightBody, paperIrradiance } from "./roomIrradiance";
import { roomFrame, type RoomFrame } from "./sharedRoom";

/** The longest throw per unit of elevation, where the light nears the screen's horizon. */
const MAX_REACH = 1.5;
/** The light's height over the screen upright, where its shadow is softest: the soft layer's blur is set for it. */
const UPRIGHT_LIGHT_Z = roomFrame({ ...STILL_POSE, beta: 90 }).light[2];
/**
 * The ceiling light's spread: the standard deviation of its light across its plane one unit along it,
 * one way, which is half the mean square distance for a round light. A sticker h up casts it h/L_z
 * along the light, so its penumbra is h·spread/L_z across the throw and h·spread/L_z² along it.
 */
const LIGHT_SPREAD = Math.sqrt(overLightBody((d) => d * d) / overLightBody(() => 1) / 2);
/**
 * The two layers' blurs per px of elevation: head-on, and upright along the throw, the edge the throw
 * shows. The soft mix grows as 1/L_z², so between them the pair tracks the penumbra along the throw;
 * across it, the true penumbra is narrower by L_z.
 */
const SHARP_BLUR = LIGHT_SPREAD;
const SOFT_BLUR = LIGHT_SPREAD / UPRIGHT_LIGHT_Z ** 2;
/** The sharp and soft mix moves in steps this size, so the tremor never repaints it. */
const MIX_STEP = 0.05;
/**
 * A shadow moves only once it would shift this far, in CSS px, at the highest elevation among the
 * mounted layers, so a held device's tremor restyles nothing.
 */
const MOVE_PX = 0.25;

/** The room light's part of paperIrradiance: the one line that names its field. */
const keyLight = (irradiance: ReturnType<typeof paperIrradiance>) => irradiance.light;
/** The room light's share of the light on the screen's flat paper, all its key shadow takes away. */
const keyShare = (frame: RoomFrame) => {
  const irradiance = paperIrradiance(frame);
  return keyLight(irradiance) / irradiance.total;
};
const STILL_SHARE = keyShare(roomFrame(STILL_POSE));
const step = (value: number) => (Math.round(value / MIX_STEP) * MIX_STEP).toFixed(2);

/**
 * The room light's key shadow under a sticker lifted one unit, from the light in screen axes (y down,
 * z toward the viewer): its offset falls away from the light, and its penumbra, which grows as 1/L_z²,
 * is a mix of a sharp head-on blur and a soft upright one. Its strength is the light's share of the
 * screen's light against the still pose's, where the design sets its ink.
 */
export function keyShadow(pose: DevicePose) {
  const frame = roomFrame(pose);
  const [lx, ly, lz] = frame.light;
  const z = Math.max(lz, 1e-3);
  const reach = Math.hypot(lx, ly) / z;
  const k = reach > MAX_REACH ? MAX_REACH / reach : 1;
  const soft = Math.min(1, Math.max(0, (1 / z ** 2 - 1) / (1 / UPRIGHT_LIGHT_Z ** 2 - 1)));
  const strength = keyShare(frame) / STILL_SHARE;
  return {
    x: (-lx / z) * k,
    y: (-ly / z) * k,
    sharp: strength * (1 - soft),
    soft: strength * soft,
  };
}

/**
 * Every mounted key shadow layer and its elevation in CSS px, written directly when the light moves
 * past the gate, so the restyle stays inside them: the offset through `transform`, and the mix only
 * when it crosses a step, since an opacity change repaints the blur.
 */
const layers = new Map<HTMLElement, number>();
let highest = 0;
let shown = keyShadow(currentLight());
let stopFollowing: (() => void) | null = null;

/** A layer's elevation as the stickers' CSS sets it; unset, its transform is invalid and it throws nothing. */
const elevationOf = (layer: HTMLElement) =>
  parseFloat(getComputedStyle(layer).getPropertyValue("--sticker-elevation")) || 0;

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
  if (!mixed && moved * highest < MOVE_PX) return;
  shown = next;
  for (const layer of layers.keys()) write(layer, mixed);
}

/** Sets the gate at the highest elevation; raised, the shadows catch up to the finer step at once. */
function gateAtHighest() {
  const before = highest;
  highest = Math.max(0, ...layers.values());
  if (highest > before) follow(currentLight());
}

/** A key shadow layer's ref: the layer follows the light while it's mounted. */
export function keyShadowLayer(layer: HTMLElement | null) {
  if (!layer) return;
  if (layers.size === 0) {
    shown = keyShadow(currentLight());
    stopFollowing = subscribeLight(follow);
  }
  // Read before this layer's writes restyle it.
  layers.set(layer, elevationOf(layer));
  gateAtHighest();
  layer.style.setProperty("--key-shadow-sharp-blur", SHARP_BLUR.toFixed(4));
  layer.style.setProperty("--key-shadow-soft-blur", SOFT_BLUR.toFixed(4));
  write(layer, true);
  return () => {
    layers.delete(layer);
    gateAtHighest();
    if (layers.size > 0) return;
    stopFollowing?.();
    stopFollowing = null;
  };
}

/**
 * Re-reads the elevation of each key shadow layer under `root`, after a class change there lifts or
 * lowers it, as taking a sticker into the hand does.
 */
export function rereadKeyShadowElevation(root: Element) {
  for (const layer of layers.keys())
    if (root.contains(layer)) layers.set(layer, elevationOf(layer));
  gateAtHighest();
}
