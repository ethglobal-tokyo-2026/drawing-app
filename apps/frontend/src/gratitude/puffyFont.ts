import { nameInitial } from "../ui/nameInitial";
import { LETTERING_WORDS } from "./tierSlamAndPopIns";

/** The multiplier sticker's digits and point: the HUD's one figure set in the puffy face. */
const MULTIPLIER_CHARACTERS = "0123456789.";

/**
 * Every character the game sets in the puffy face: the lettering's words, the multiplier's figures
 * and the giver's initial. Google Fonts serves the face in slices, each fetched only when one of its
 * characters first shows, so unasked, a slice would arrive mid-combo and its text would swap
 * typefaces as it lands.
 */
export function puffyCharacters(giverName: string): string {
  const shown = LETTERING_WORDS.map(({ jp }) => jp).join("") + MULTIPLIER_CHARACTERS;
  return [...new Set(shown + nameInitial(giverName))].join("");
}

/**
 * Asks for the puffy face, `--font-puffy`, in every character the game sets in it; call it as the
 * game opens. Where the browser can't load fonts ahead, the text loads as it first shows.
 */
export function loadPuffyFont(
  giverName: string,
  fonts: Pick<FontFaceSet, "load"> | undefined = typeof document === "undefined"
    ? undefined
    : document.fonts,
  family?: string,
): void {
  if (!fonts) return;
  const typeface =
    family ?? getComputedStyle(document.documentElement).getPropertyValue("--font-puffy").trim();
  if (!typeface) return;
  fonts.load(`1em ${typeface}`, puffyCharacters(giverName)).catch((error: unknown) => {
    console.warn(
      "The game's puffy typeface wasn't fetched ahead, so its text may swap typefaces as it lands",
      error,
    );
  });
}
