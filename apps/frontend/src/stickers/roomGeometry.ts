import { VIEWING_CLASS } from "./viewing";

/** The room stickers are seen in: lengths in meters, angles in degrees. */

/** A 3.6 m square room, 2.4 m high, with the device held 1.0 m above its floor. */
export const ROOM_SIZE = { width: 3.6, depth: 3.6, height: 2.4 } as const;
export const DEVICE_HEIGHT = 1.0;
/** The surfaces' reflectances, within EN 12464-1's recommended ranges. */
export const REFLECTANCE = { ceiling: 0.8, walls: 0.6, floor: 0.3 } as const;

/** Design decision: a compact light whose resting reflection clears the artwork. */
export const DIFFUSER_RADIUS = 0.1;
/** Each device's viewer needs a different source elevation to clear its screen at rest. */
export const LIGHT_PLACEMENTS = {
  phone: { elevation: 60, azimuth: 0 },
  tablet: { elevation: 84, azimuth: 0 },
} as const;
export const LIGHT_ELEVATION = LIGHT_PLACEMENTS[VIEWING_CLASS].elevation;
export const LIGHT_AZIMUTH = LIGHT_PLACEMENTS[VIEWING_CLASS].azimuth;

const RAD = Math.PI / 180;
export const CEILING_ABOVE_DEVICE = ROOM_SIZE.height - DEVICE_HEIGHT;
/** From the device to the diffuser's middle. */
export const LIGHT_DISTANCE = CEILING_ABOVE_DEVICE / Math.sin(LIGHT_ELEVATION * RAD);
/** The tan of the diffuser's angular radius across the line of sight. */
export const LIGHT_RADIUS = DIFFUSER_RADIUS / LIGHT_DISTANCE;
/** The diffuser's foreshortened height against its width: a level disc seen from this elevation. */
export const LIGHT_ASPECT = Math.sin(LIGHT_ELEVATION * RAD);
