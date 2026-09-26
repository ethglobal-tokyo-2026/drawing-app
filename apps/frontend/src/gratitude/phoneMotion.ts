/**
 * One motion sample: the phone's sideways and vertical acceleration with gravity taken out, in
 * m/s², gravity's sideways pull (the phone's roll) where the phone reports it, and the time in ms.
 * Each has the spec's sign on every platform: a push toward the phone's right is +x, and the pull
 * is positive with the phone's right edge up.
 */
export type MotionSample = (ax: number, ay: number, gx: number | null, t: number) => void;

/** A sample's share of the way the gravity estimate moves toward it: slow, so a shake stays out of it. */
const GRAVITY_FOLLOW = 0.1;
const STANDARD_GRAVITY = 9.80665;
/**
 * Not every platform gives the motion the spec's sign: WebKit is reported to flip it. The
 * orientation's angles mean the same everywhere, so the sign is found by checking gravity against
 * them. A sample counts only when the phone is still, within `still` m/s² of resting, and gravity
 * lies within 45° (`agree`, the cosine) of the orientation's up or its down. `samples` in a row
 * settle the sign. Samples wait up to `waitMs` for it; past that, they go out with the spec's sign.
 */
const SIGN_CHECK = { still: 1.5, agree: 0.7, samples: 3, waitMs: 500 };

interface Vector {
  x: number;
  y: number;
  z: number;
}

/** A sensor reading, with any missing axis but x as 0; null without x. */
const vectorOf = (v: DeviceMotionEventAcceleration | null): Vector | null =>
  typeof v?.x === "number" ? { x: v.x, y: v.y ?? 0, z: v.z ?? 0 } : null;

/**
 * The sign a still sample shows against the orientation: 1 where `accelerationIncludingGravity`
 * points up, as the spec has it, −1 where it points down, 0 where the sample can't tell.
 */
function signShown(tilt: { beta: number; gamma: number }, raw: Vector, linear: Vector): -1 | 0 | 1 {
  const size = Math.hypot(raw.x, raw.y, raw.z);
  const moving = Math.hypot(linear.x, linear.y, linear.z);
  if (Math.abs(size - STANDARD_GRAVITY) > SIGN_CHECK.still || moving > SIGN_CHECK.still) return 0;
  const beta = (tilt.beta * Math.PI) / 180;
  const gamma = (tilt.gamma * Math.PI) / 180;
  // Up, in the phone's own axes, for this orientation.
  const up = {
    x: -Math.cos(beta) * Math.sin(gamma),
    y: Math.sin(beta),
    z: Math.cos(beta) * Math.cos(gamma),
  };
  const along = (raw.x * up.x + raw.y * up.y + raw.z * up.z) / size;
  return along > SIGN_CHECK.agree ? 1 : along < -SIGN_CHECK.agree ? -1 : 0;
}

/**
 * Reports the phone's motion until the returned function is called. It listens whatever the motion
 * permission says: where motion isn't allowed, no events arrive. On iOS the one permission covers
 * both the motion and the orientation.
 */
export function listenToPhoneMotion(onSample: MotionSample): () => void {
  let gravity: Vector | null = null;
  /** Gravity's sideways pull: the estimate's x, low-passed again to keep a shake's jerk out. */
  let pull: number | null = null;
  /** 1 where the platform has the spec's sign, −1 where it's flipped; null until it's found. */
  let sign: 1 | -1 | null = null;
  /** Still samples in a row that showed one sign, counted with that sign. */
  let inARow = 0;
  /** The orientation since the last motion sample. */
  let tilt: { beta: number; gamma: number } | null = null;
  let firstAt: number | null = null;

  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.beta !== null && e.gamma !== null) tilt = { beta: e.beta, gamma: e.gamma };
  };
  const stopTilt = () => window.removeEventListener("deviceorientation", onTilt);

  const onMotion = (e: DeviceMotionEvent) => {
    const raw = vectorOf(e.accelerationIncludingGravity);
    if (raw) {
      gravity ??= { ...raw };
      gravity.x += (raw.x - gravity.x) * GRAVITY_FOLLOW;
      gravity.y += (raw.y - gravity.y) * GRAVITY_FOLLOW;
      gravity.z += (raw.z - gravity.z) * GRAVITY_FOLLOW;
      pull = pull === null ? gravity.x : pull + (gravity.x - pull) * GRAVITY_FOLLOW;
    }
    // A phone that reports no linear acceleration has the slow gravity estimate taken out instead.
    const linear =
      vectorOf(e.acceleration) ??
      (raw && gravity
        ? { x: raw.x - gravity.x, y: raw.y - gravity.y, z: raw.z - gravity.z }
        : null);
    if (!linear) return;
    if (sign === null && tilt && raw) {
      const shown = signShown(tilt, raw, linear);
      tilt = null;
      inARow = shown !== 0 && Math.sign(inARow) === shown ? inARow + shown : shown;
      if (Math.abs(inARow) >= SIGN_CHECK.samples) {
        sign = inARow > 0 ? 1 : -1;
        stopTilt();
      }
    }
    firstAt ??= e.timeStamp;
    if (sign === null && e.timeStamp - firstAt < SIGN_CHECK.waitMs) return;
    const s = sign ?? 1;
    onSample(s * linear.x, s * linear.y, pull === null ? null : s * pull, e.timeStamp);
  };
  window.addEventListener("devicemotion", onMotion);
  window.addEventListener("deviceorientation", onTilt, { passive: true });
  return () => {
    window.removeEventListener("devicemotion", onMotion);
    stopTilt();
  };
}
