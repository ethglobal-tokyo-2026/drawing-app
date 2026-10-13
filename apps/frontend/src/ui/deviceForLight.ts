export type DeviceForLight = "phone-or-tablet" | "desktop" | "unknown";

export interface DeviceFactsForLight {
  userAgent: string;
  maxTouchPoints: number;
}

/** iPadOS may present a Macintosh user agent; retain the existing iOS permission check. */
export const isAppleMobile = ({ userAgent, maxTouchPoints }: DeviceFactsForLight): boolean =>
  /iPhone|iPad|iPod/.test(userAgent) || (userAgent.includes("Macintosh") && maxTouchPoints > 1);

/** Browser facts are an imperfect hardware proxy: ambiguous devices never qualify for timed light. */
export function deviceForLight(facts: DeviceFactsForLight): DeviceForLight {
  const { userAgent, maxTouchPoints } = facts;
  if (isAppleMobile(facts) || /Android|Mobile|Tablet|Silk|Kindle|Windows Phone/i.test(userAgent))
    return "phone-or-tablet";
  if (!Number.isInteger(maxTouchPoints) || maxTouchPoints !== 0) return "unknown";
  return /Macintosh|Windows NT|X11|CrOS/.test(userAgent) ? "desktop" : "unknown";
}
