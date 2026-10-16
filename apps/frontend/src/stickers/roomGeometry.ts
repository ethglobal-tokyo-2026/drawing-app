/**
 * The room stickers are seen in, fixed in the world: lengths in metres, angles in degrees. Pure
 * constants with no imports, so a Node script can solve the same room.
 */

/** A 3.6 m square room, 2.4 m high, with the device held 1.0 m above its floor. */
export const ROOM_SIZE = { width: 3.6, depth: 3.6, height: 2.4 } as const;
export const DEVICE_HEIGHT = 1.0;
/** The surfaces' reflectances, within EN 12464-1's recommended ranges. */
export const REFLECTANCE = { ceiling: 0.8, walls: 0.6, floor: 0.3 } as const;

/** The ceiling light's diffuser: an 8-tatami fixture's 45 cm cover (Panasonic HH-CK0825CA; JLMA's 3,800 lm standard). */
export const DIFFUSER_RADIUS = 0.225;
/**
 * Where the light hangs, seen from the device: its elevation, and its azimuth to the viewer's left of
 * straight behind. A design decision: of the places whose glare at each class's still pose falls off
 * the screen, it stays in front of a screen tilted furthest past upright, and it lights the stickers
 * from the top left, as the app's controls are.
 */
export const LIGHT_ELEVATION = 55;
export const LIGHT_AZIMUTH = 45;

const RAD = Math.PI / 180;
export const CEILING_ABOVE_DEVICE = ROOM_SIZE.height - DEVICE_HEIGHT;
/** From the device to the diffuser's middle. */
export const LIGHT_DISTANCE = CEILING_ABOVE_DEVICE / Math.sin(LIGHT_ELEVATION * RAD);
/** The tan of the diffuser's angular radius across the line of sight. */
export const LIGHT_RADIUS = DIFFUSER_RADIUS / LIGHT_DISTANCE;
/** The diffuser's foreshortened height against its width: a level disc seen from this elevation. */
export const LIGHT_ASPECT = Math.sin(LIGHT_ELEVATION * RAD);
