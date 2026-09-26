export const formatNo = (no: number) => `No.${String(no).padStart(4, "0")}`;
/** A handle as it's printed: one "@", however many it came with. */
export const formatHandle = (handle: string) => `@${handle.replace(/^@+/, "")}`;
export const formatDay = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

/** "9.23": a day within the recent past, where the year goes without saying. */
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
 * as a time of day. The live timer is a clock face and keeps "4:52".
 */
export function formatDuration(seconds: number) {
  const { m, s } = durationParts(seconds);
  return [m > 0 && `${m}m`, s !== null && `${s}s`].filter(Boolean).join(" ");
}

/** A drawing time as it's read aloud: "4 minutes 52 seconds". */
export function spokenDuration(seconds: number) {
  const { m, s } = durationParts(seconds);
  const count = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  return [m > 0 && count(m, "minute"), s !== null && count(s, "second")].filter(Boolean).join(" ");
}
