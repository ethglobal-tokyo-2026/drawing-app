import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useTranslation } from "../i18n/react";
import { SubjectThought } from "../kyoto-seika/SubjectThought";
import { thoughtLayout, type Pair } from "../kyoto-seika/thoughtLayout";
import { thoughtPlacement, type ThoughtSpot } from "./thoughtPlacement";
import { outlineShape } from "./tray/sheetPacking";

interface Props {
  subjects: Pair;
  art: { width: number; height: number; outline?: string };
  figure: RefObject<HTMLSpanElement | null>;
  reduced: boolean;
}

/** The subjects stay beside the detail's visible cut, in the same stage as the sticker. */
export function DetailThoughtLayer({ subjects, art, figure, reduced }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<ThoughtSpot | null>(null);
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  const cut = useMemo(
    () =>
      art.outline
        ? outlineShape(art.outline, art.width, art.height).poly.map(([x, y]) => ({ x, y }))
        : undefined,
    [art.outline, art.width, art.height],
  );

  useLayoutEffect(() => {
    const el = layer.current;
    const sticker = figure.current;
    if (!el || !sticker) return;
    const place = () => {
      const W = el.offsetWidth;
      const H = el.offsetHeight;
      const w = sticker.offsetWidth;
      const h = sticker.offsetHeight;
      if (!W || !H || !w || !h) return;
      setSpot(
        thoughtPlacement({
          sticker: {
            x: sticker.offsetLeft + w / 2,
            y: sticker.offsetTop + h / 2,
            w,
            h,
            r: 0,
            cut,
          },
          board: { W, H, top: 4, bottom: H - 4 },
          shape: (toward) => thoughtLayout(subjects, "detail", toward),
          avoid: [],
        }),
      );
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(el);
    observer.observe(sticker);
    return () => observer.disconnect();
  }, [subjects, cut, figure, language]);

  return (
    <div ref={layer} className="sticker-detail__subjects" aria-hidden="true">
      {spot && (
        <SubjectThought
          subjects={subjects}
          size="detail"
          toward={spot.toward}
          at={{ x: spot.left, y: spot.top }}
          layout={spot.layout}
          reduced={reduced}
        />
      )}
    </div>
  );
}
