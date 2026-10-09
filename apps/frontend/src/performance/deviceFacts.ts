interface Size {
  width: number;
  height: number;
}
type Side = "top" | "right" | "bottom" | "left";
const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];

/**
 * What a device and its browser say about themselves, as far as a layout depends on it: for the
 * developer slip's Device paper and the performance report, where no developer tools reach.
 */
export interface DeviceFacts {
  userAgent: string;
  platform: string;
  touchPoints: number;
  viewport: Size;
  /** The part of the page on screen; null where the browser has none. */
  visualViewport: (Size & { left: number; top: number; scale: number }) | null;
  screen: Size & { orientation: string | null };
  pixelRatio: number;
  /** env(safe-area-inset-*), in CSS px. */
  safeArea: Record<Side, number>;
  /** Each media feature with the values it matches. */
  media: { feature: string; matches: string[] }[];
}

/** The media features an iPad answers its own way, each with the values it can match. */
const MEDIA_FEATURES = [
  { feature: "hover", values: ["hover", "none"] },
  { feature: "any-hover", values: ["hover", "none"] },
  { feature: "pointer", values: ["fine", "coarse", "none"] },
  { feature: "any-pointer", values: ["fine", "coarse", "none"] },
];

/** env(safe-area-inset-*), through a probe padded by them, since script can't read env(). */
function readSafeArea(): Record<Side, number> {
  const probe = document.createElement("div");
  probe.style.setProperty("position", "fixed");
  probe.style.setProperty("visibility", "hidden");
  for (const side of SIDES)
    probe.style.setProperty(`padding-${side}`, `env(safe-area-inset-${side})`);
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const px = (side: Side) =>
    Math.round(Number.parseFloat(style.getPropertyValue(`padding-${side}`)) || 0);
  const safeArea = { top: px("top"), right: px("right"), bottom: px("bottom"), left: px("left") };
  probe.remove();
  return safeArea;
}

/** What the device and its browser say now. */
export function readDeviceFacts(): DeviceFacts {
  const visual = window.visualViewport;
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    touchPoints: navigator.maxTouchPoints,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    visualViewport: visual
      ? {
          width: visual.width,
          height: visual.height,
          left: visual.offsetLeft,
          top: visual.offsetTop,
          scale: visual.scale,
        }
      : null,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      // Older Safari has no screen.orientation.
      orientation: window.screen.orientation?.type ?? null,
    },
    pixelRatio: window.devicePixelRatio,
    safeArea: readSafeArea(),
    media: MEDIA_FEATURES.map(({ feature, values }) => ({
      feature,
      matches: values.filter((value) => window.matchMedia(`(${feature}: ${value})`).matches),
    })),
  };
}

/**
 * Calls `onChange` whenever what the device says may have changed: a turn, a resize or a zoom, or a
 * Pencil, trackpad or mouse coming or going. Returns what stops it.
 */
export function watchDeviceFacts(onChange: () => void): () => void {
  const media = MEDIA_FEATURES.flatMap(({ feature, values }) =>
    values.map((value) => window.matchMedia(`(${feature}: ${value})`)),
  );
  window.addEventListener("resize", onChange);
  window.visualViewport?.addEventListener("resize", onChange);
  window.screen.orientation?.addEventListener("change", onChange);
  for (const query of media) query.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
    window.visualViewport?.removeEventListener("resize", onChange);
    window.screen.orientation?.removeEventListener("change", onChange);
    for (const query of media) query.removeEventListener("change", onChange);
  };
}

const size = ({ width, height }: Size) => `${Math.round(width)}×${Math.round(height)}`;

/**
 * The facts as labeled rows, whether the app lays out for a large screen (ui/largeScreen.ts) last: the
 * Device paper's rows, the report's lines.
 */
export function deviceFactRows(facts: DeviceFacts, large: boolean): [string, string][] {
  const visual = facts.visualViewport;
  const viewport = visual
    ? `${size(facts.viewport)} · visual ${size(visual)} at ${Math.round(visual.left)},${Math.round(visual.top)}, scale ${visual.scale}`
    : `${size(facts.viewport)} · no visual viewport`;
  const screenParts = [size(facts.screen), `at ${facts.pixelRatio}x`, facts.screen.orientation];
  const media = facts.media.map(
    ({ feature, matches }) => `${feature} ${matches.join(" ") || "nothing"}`,
  );
  return [
    ["User agent", facts.userAgent],
    ["Platform", `${facts.platform || "none"} · ${facts.touchPoints} touch points`],
    ["Viewport", viewport],
    ["Screen", screenParts.filter(Boolean).join(" ")],
    ["Safe areas", SIDES.map((side) => `${side} ${facts.safeArea[side]}`).join(" · ")],
    ["Media", media.join(" · ")],
    ["Large screen", large ? "yes" : "no"],
  ];
}

/** The rows as a report's lines. */
export const deviceLines = (facts: DeviceFacts, large: boolean) =>
  deviceFactRows(facts, large).map(([label, value]) => `${label}: ${value}`);

/** The facts as text to paste into a chat. */
export const formatDeviceDetails = (facts: DeviceFacts, large: boolean, takenAt: Date) =>
  [`Device details, taken ${takenAt.toISOString()}`, ...deviceLines(facts, large)].join("\n");
