import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { currentLanguage } from "../i18n/i18n";
import { useTranslation } from "../i18n/react";

/**
 * The canvas's name once begun: its pair, since the faint corner print says nothing to screen readers.
 * In English each word comes with its English, as the balloons showed it; Japanese hears the words
 * alone.
 */
export function useCanvasName(
  pair: readonly [KyotoSeikaSubject, KyotoSeikaSubject] | null,
): string | undefined {
  const { t } = useTranslation();
  if (!pair) return undefined;
  const spoken = ({ ja, en }: KyotoSeikaSubject) =>
    currentLanguage() === "ja"
      ? ja
      : t(($) => $.kyotoSeika.balloons.subject, { word: ja, english: en });
  return t(($) => $.kyotoSeika.print.canvas, { first: spoken(pair[0]), second: spoken(pair[1]) });
}
