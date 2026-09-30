import { LETTERING_WORDS } from "./tierSlamAndPopIns";

/**
 * Every character the lettering can show: what's slammed in and the pop-in words. Google Fonts
 * serves the lettering's Japanese in slices, each fetched only when one of its characters first
 * shows, so unasked, a slice would arrive mid-combo and its word would swap typefaces as it lands.
 */
export function letteringCharacters(): string {
  return [...new Set(LETTERING_WORDS.map(({ jp }) => jp).join(""))].join("");
}

/**
 * Asks for the lettering's typeface, `--font-puffy`, in every character it can show; call it as the
 * game opens. Where the browser can't load fonts ahead, the words load as they first show.
 */
export function loadLetteringFonts(
  fonts: Pick<FontFaceSet, "load"> | undefined = typeof document === "undefined"
    ? undefined
    : document.fonts,
  family?: string,
): void {
  if (!fonts) return;
  const typeface =
    family ?? getComputedStyle(document.documentElement).getPropertyValue("--font-puffy").trim();
  if (!typeface) return;
  fonts.load(`1em ${typeface}`, letteringCharacters()).catch((error: unknown) => {
    console.warn(
      "The lettering's typeface wasn't fetched ahead, so its words may swap typefaces as they land",
      error,
    );
  });
}
