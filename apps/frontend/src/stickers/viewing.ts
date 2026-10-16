/**
 * How each class of device is held: the eye's distance from the screen in CSS px, and the reading
 * pose's beta. Phones are read at 34 cm (Boccardo 2021 and 2023, Chen 2022, Naipal 2025) and tablets at
 * 50 cm (Young 2012), at an iPhone 17's 60.37 and an iPad Pro M5's 51.97 CSS px per cm. The tablet's
 * beta is Young 2012's self-selected lap tilt; the phone's follows Chen 2022's gaze angles.
 */
export const VIEWING = {
  phone: { eyeDistance: 2050, stillBeta: 47 },
  tablet: { eyeDistance: 2600, stillBeta: 36 },
} as const;

export type ViewingClass = keyof typeof VIEWING;

/** Android's boundary between phones and tablets, 600 dp, on the screen's short side in CSS px. */
const TABLET_SHORT_SIDE = 600;

/** What the class is read from: the window's screen and its pointer. */
export interface ViewingWindow {
  readonly screen: { readonly width: number; readonly height: number };
  readonly matchMedia: (query: string) => { readonly matches: boolean };
}

/** A phone has a coarse pointer and a screen whose short side is under 600 CSS px; anything else sits as a tablet does. */
export function viewingClassOf(win: ViewingWindow): ViewingClass {
  const shortSide = Math.min(win.screen.width, win.screen.height);
  return win.matchMedia("(pointer: coarse)").matches && shortSide < TABLET_SHORT_SIDE
    ? "phone"
    : "tablet";
}

/** The device's class, read once: turning the screen never changes it. Without a window, a phone. */
export const VIEWING_CLASS: ViewingClass =
  typeof window === "undefined" || typeof window.matchMedia !== "function"
    ? "phone"
    : viewingClassOf(window);
