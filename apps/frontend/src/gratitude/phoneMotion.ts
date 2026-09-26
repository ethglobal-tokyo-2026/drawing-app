import { FEEL_CONFIG } from "./gameConfig";

/**
 * One motion sample: the phone's sideways and vertical motion in m/s², gravity's sideways pull (the
 * phone's roll) where the phone reports it, and the time in ms. The motion is the acceleration with
 * gravity taken out; sideways, it's the stronger of that and a twist of the wrist, scaled into the
 * same units, so a twist and the push it gives the phone count as one motion.
 *
 * Each has the spec's sign on every platform: a push toward the phone's right is +x, and the pull is
 * positive with the phone's right edge up. A twist about the phone's long axis that turns its screen
 * to the right is +x, like the push it gives a phone held in the palm; a twist about another axis
 * keeps the sign the last twist had.
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
 * settle the sign. A reversal doesn't depend on the sign, so the motion goes out at once, with the
 * spec's sign until the sign is found. The pull from the gravity estimate waits up to `waitMs` for
 * it, and past that takes the spec's sign too.
 */
const SIGN_CHECK = { still: 1.5, agree: 0.7, samples: 3, waitMs: 500 };

const { deadZone, minPeak, twistPeakDegPerS } = FEEL_CONFIG.shake;
/** m/s² for each °/s of twist: a twist at `twistPeakDegPerS` peaks at `minPeak`. */
const TWIST_SCALE = minPeak / twistPeakDegPerS;

interface Vector {
  x: number;
  y: number;
  z: number;
}

/** A sensor reading, with any missing axis but x as 0; null without x. */
const vectorOf = (v: DeviceMotionEventAcceleration | null): Vector | null =>
  typeof v?.x === "number" ? { x: v.x, y: v.y ?? 0, z: v.z ?? 0 } : null;

/**
 * The turning rate in °/s about the phone's own x, y and z (the spec's beta, gamma and alpha), with
 * any missing axis as 0; null where the phone has no gyroscope.
 */
const turnOf = (r: DeviceMotionEventRotationRate | null | undefined): Vector | null =>
  r && [r.alpha, r.beta, r.gamma].some((v) => typeof v === "number")
    ? { x: r.beta ?? 0, y: r.gamma ?? 0, z: r.alpha ?? 0 }
    : null;

const dot = (a: Vector, b: Vector) => a.x * b.x + a.y * b.y + a.z * b.z;

/** Up, in the phone's own axes, for the orientation's angles in degrees. */
function upOf(betaDeg: number, gammaDeg: number): Vector {
  const beta = (betaDeg * Math.PI) / 180;
  const gamma = (gammaDeg * Math.PI) / 180;
  return {
    x: -Math.cos(beta) * Math.sin(gamma),
    y: Math.sin(beta),
    z: Math.cos(beta) * Math.cos(gamma),
  };
}

/**
 * The sign a still sample shows against the orientation's `up`: 1 where
 * `accelerationIncludingGravity` points up, as the spec has it, −1 where it points down, 0 where the
 * sample can't tell.
 */
function signShown(up: Vector, raw: Vector, linear: Vector): -1 | 0 | 1 {
  const size = Math.hypot(raw.x, raw.y, raw.z);
  const moving = Math.hypot(linear.x, linear.y, linear.z);
  if (Math.abs(size - STANDARD_GRAVITY) > SIGN_CHECK.still || moving > SIGN_CHECK.still) return 0;
  const along = dot(raw, up) / size;
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
  /** Up, from the latest orientation. */
  let up: Vector | null = null;
  /** An orientation has come since the last motion sample, for the sign check. */
  let freshTilt = false;
  let firstAt: number | null = null;
  /** The axis the wrist twists the phone about, a unit vector: its long axis until a clear turn. */
  const axis: Vector = { x: 0, y: 1, z: 0 };

  /**
   * The twist about `axis`, in the shake's units. A turn past the dead zone moves the axis onto its
   * own, kept pointing the way it did, so twisting back and forth flips the sign at each turn
   * however the phone is held.
   */
  const twistOf = (turn: Vector) => {
    const speed = Math.hypot(turn.x, turn.y, turn.z);
    if (speed * TWIST_SCALE > deadZone) {
      const k = (dot(turn, axis) < 0 ? -1 : 1) / speed;
      axis.x = turn.x * k;
      axis.y = turn.y * k;
      axis.z = turn.z * k;
    }
    return dot(turn, axis) * TWIST_SCALE;
  };

  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    up = upOf(e.beta, e.gamma);
    freshTilt = true;
  };

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
    if (sign === null && freshTilt && up && raw) {
      const shown = signShown(up, raw, linear);
      freshTilt = false;
      inARow = shown !== 0 && Math.sign(inARow) === shown ? inARow + shown : shown;
      if (Math.abs(inARow) >= SIGN_CHECK.samples) sign = inARow > 0 ? 1 : -1;
    }
    firstAt ??= e.timeStamp;
    const s = sign ?? 1;
    const turn = turnOf(e.rotationRate);
    const twist = turn ? twistOf(turn) : 0;
    const sideways = s * linear.x;
    // A phone with a gyroscope fuses its orientation from it, so the orientation keeps a shake's
    // jerk out with no lag. Otherwise the pull is the gravity estimate low-passed twice, and its
    // sign is the platform's.
    const gx =
      turn && up
        ? STANDARD_GRAVITY * up.x
        : pull !== null && (sign !== null || e.timeStamp - firstAt >= SIGN_CHECK.waitMs)
          ? s * pull
          : null;
    onSample(
      Math.abs(twist) > Math.abs(sideways) ? twist : sideways,
      s * linear.y,
      gx,
      e.timeStamp,
    );
  };
  window.addEventListener("devicemotion", onMotion);
  window.addEventListener("deviceorientation", onTilt, { passive: true });
  return () => {
    window.removeEventListener("devicemotion", onMotion);
    window.removeEventListener("deviceorientation", onTilt);
  };
}
