/**
 * One motion sample: the phone's sideways and vertical acceleration with gravity taken out, in
 * m/s², gravity's sideways pull (the phone's roll) where the phone reports it, and the time in ms.
 */
export type MotionSample = (ax: number, ay: number, gx: number | null, t: number) => void;

/** A sample's share of the way the gravity estimate moves toward it: slow, so a shake stays out of it. */
const GRAVITY_FOLLOW = 0.1;

/**
 * Reports the phone's motion until the returned function is called. It listens whatever the motion
 * permission says: where motion isn't allowed, no events arrive.
 */
export function listenToPhoneMotion(onSample: MotionSample): () => void {
  let gravity: { x: number; y: number } | null = null;
  const onMotion = (e: DeviceMotionEvent) => {
    const linear = e.acceleration;
    const withGravity = e.accelerationIncludingGravity;
    const gx = typeof withGravity?.x === "number" ? withGravity.x : null;
    if (typeof linear?.x === "number") {
      onSample(linear.x, linear.y ?? 0, gx, e.timeStamp);
      return;
    }
    if (gx === null) return;
    // This phone reports no linear acceleration: a slow low-pass finds gravity to take out.
    const gy = withGravity?.y ?? 0;
    gravity ??= { x: gx, y: gy };
    gravity.x += (gx - gravity.x) * GRAVITY_FOLLOW;
    gravity.y += (gy - gravity.y) * GRAVITY_FOLLOW;
    onSample(gx - gravity.x, gy - gravity.y, gx, e.timeStamp);
  };
  window.addEventListener("devicemotion", onMotion);
  return () => window.removeEventListener("devicemotion", onMotion);
}
