import { isAgeStatus, type AgeStatus } from "../identity/ageStatus";

// Stand-in for the API until it stores NSFW stickers and World ID's age status: this device's record of
// the stickers sealed as NSFW, and the developer slip's overrides. Delete it once the API sends both.

const KEY = "draw.nsfwDemo";

export interface NsfwDemoSettings {
  /** Your age status from the developer slip; null reads it from the demo's people. */
  myAgeStatus: AgeStatus | null;
  /** Stickers sealed as NSFW on this device. */
  stickerIds: string[];
  /** Sticker Nos. marked NSFW in the developer slip, for a window that didn't seal them. */
  stickerNos: number[];
}

const EMPTY: NsfwDemoSettings = { myAgeStatus: null, stickerIds: [], stickerNos: [] };

const isSettings = (value: unknown): value is NsfwDemoSettings =>
  typeof value === "object" &&
  value !== null &&
  "myAgeStatus" in value &&
  (value.myAgeStatus === null || isAgeStatus(value.myAgeStatus)) &&
  "stickerIds" in value &&
  Array.isArray(value.stickerIds) &&
  value.stickerIds.every((id) => typeof id === "string") &&
  "stickerNos" in value &&
  Array.isArray(value.stickerNos) &&
  value.stickerNos.every((no) => Number.isInteger(no) && no > 0);

export function readNsfwDemo(): NsfwDemoSettings {
  let stored: string | null;
  try {
    stored = localStorage.getItem(KEY);
  } catch (error) {
    console.error("The NSFW demo's settings couldn't be read", error);
    return EMPTY;
  }
  if (stored === null) return EMPTY;
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch (error) {
    console.error(`The NSFW demo's settings aren't JSON: ${stored}`, error);
    return EMPTY;
  }
  if (isSettings(value)) return value;
  console.error(`Skipped unreadable NSFW demo settings: ${stored}`);
  return EMPTY;
}

export function saveNsfwDemo(settings: NsfwDemoSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("The NSFW demo's settings couldn't be saved", error);
  }
}

/** Records a sticker sealed as NSFW on this device. */
export function markNsfwSticker(stickerId: string): void {
  const settings = readNsfwDemo();
  if (!settings.stickerIds.includes(stickerId))
    saveNsfwDemo({ ...settings, stickerIds: [...settings.stickerIds, stickerId] });
}

export function isNsfwSticker(sticker: { id: string; number: number }): boolean {
  const { stickerIds, stickerNos } = readNsfwDemo();
  return stickerIds.includes(sticker.id) || stickerNos.includes(sticker.number);
}
