/** The gratitude mini-game demo's switches, kept on this device. */
export interface MiniGameDemoSettings {
  /** The mini-game's intensity dial at full, the design's setting for the presentation. */
  fullEffects: boolean;
  /** A readout of frame times on the mini-game, for measuring on a phone. */
  showFrameTimes: boolean;
}

const KEY = "draw.gratitudeDemo";
const OFF: MiniGameDemoSettings = { fullEffects: false, showFrameTimes: false };

export function readMiniGameDemoSettings(): MiniGameDemoSettings {
  let stored: string | null;
  try {
    stored = localStorage.getItem(KEY);
  } catch (error) {
    console.error("The gratitude demo's settings couldn't be read", error);
    return OFF;
  }
  if (stored === null) return OFF;
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch (error) {
    console.error(`The gratitude demo's settings aren't JSON: ${stored}`, error);
    return OFF;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "fullEffects" in value &&
    typeof value.fullEffects === "boolean" &&
    "showFrameTimes" in value &&
    typeof value.showFrameTimes === "boolean"
  )
    return { fullEffects: value.fullEffects, showFrameTimes: value.showFrameTimes };
  console.error(`Skipped unreadable gratitude demo settings: ${stored}`);
  return OFF;
}

export function saveMiniGameDemoSettings(settings: MiniGameDemoSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("The gratitude demo's settings couldn't be saved", error);
  }
}
