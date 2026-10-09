import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { currentLanguage } from "../i18n/i18n";
import { pairLayout, type PairSize, type Pt, type ThoughtWord } from "./balloonGeometry";
import { hasKanji } from "./subjectList";

export type Pair = readonly [KyotoSeikaSubject, KyotoSeikaSubject];

/**
 * A pair's words as its clouds letter them: English in English, and in Japanese the word as the test
 * prints it, with its reading over kanji only in the detail.
 */
function thoughtWords(pair: Pair, size: PairSize, english: boolean): [ThoughtWord, ThoughtWord] {
  const word = ({ ja, reading, en }: KyotoSeikaSubject): ThoughtWord =>
    english
      ? { text: en, reading: "", english: true }
      : { text: ja, reading: size === "detail" && hasKanji(ja) ? reading : "", english: false };
  return [word(pair[0]), word(pair[1])];
}

/** In the detail the sticker stands above the clouds' column, or beside it on a large screen. */
export const DETAIL_TOWARD = { x: -0.6, y: -0.8 };

/** The pair's clouds and trail at `size`, laid out for the language on screen. */
export const thoughtLayout = (
  pair: Pair,
  size: PairSize,
  toward: Pt,
  english = currentLanguage() === "en",
) => pairLayout(thoughtWords(pair, size, english), size, toward);
