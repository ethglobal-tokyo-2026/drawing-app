import { currentLanguage, i18next } from "../i18n/i18n";
import type { Language } from "../i18n/language";

export const formatNo = (no: number) => `No.${String(no).padStart(4, "0")}`;
/** A handle as it's printed: one "@", however many it came with. */
export const formatHandle = (handle: string) => `@${handle.replace(/^@+/, "")}`;
export const formatDay = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};
/** A day in the short form a caption has room for: "9.23". */
export const formatMonthDay = (t: number) => {
  const d = new Date(t);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};

/** Whole minutes and the seconds past them; the seconds are left out on the minute. */
function durationParts(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return { m, s: s > 0 || m === 0 ? s : null };
}

/**
 * A drawing time with units, "4m 52s", "5m" on the minute and "54s" under one, so it can't be read
 * as a time of day. The live timer is a clock face and keeps "4:52". In the app's language unless
 * `lng` names another, as a Gift Message does for the giver's.
 */
export function formatDuration(seconds: number, lng: Language = currentLanguage()) {
  const { m, s } = durationParts(seconds);
  if (m > 0 && s !== null) {
    return i18next.t(($) => $.stickers.duration.minutesAndSeconds, { minutes: m, seconds: s, lng });
  }
  if (m > 0) return i18next.t(($) => $.stickers.duration.minutes, { minutes: m, lng });
  return i18next.t(($) => $.stickers.duration.seconds, { seconds: s ?? 0, lng });
}

/** A drawing time as it's read aloud: "4 minutes 52 seconds". */
export function spokenDuration(seconds: number, lng: Language = currentLanguage()) {
  const { m, s } = durationParts(seconds);
  const minutes = i18next.t(($) => $.stickers.spokenDuration.minutes, { count: m, lng });
  const secondsSpoken = i18next.t(($) => $.stickers.spokenDuration.seconds, { count: s ?? 0, lng });
  if (m > 0 && s !== null) {
    return i18next.t(($) => $.stickers.spokenDuration.minutesAndSeconds, {
      minutes,
      seconds: secondsSpoken,
      lng,
    });
  }
  return m > 0 ? minutes : secondsSpoken;
}
