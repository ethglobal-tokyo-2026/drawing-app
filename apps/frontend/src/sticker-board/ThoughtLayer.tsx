import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../i18n/react";
import { SubjectThought } from "../kyoto-seika/SubjectThought";
import { thoughtLayout } from "../kyoto-seika/thoughtLayout";
import { knobBox, type Box } from "./placement";
import { THOUGHT_INSET_PX, thoughtPlacement, type ThoughtSpot } from "./thoughtPlacement";
import { outlineShape } from "./tray/sheetPacking";
import "./thought-layer.css";

/** What a peek keeps clear of besides the sticker's knob: its toolbar, the header's controls, the board's key and the tabs. */
const CLEAR_OF = [".sticker-toolbar", ".board-who", ".board-gifts", ".explore-chip", ".board-draw"];

interface Props {
  subjects: readonly [KyotoSeikaSubject, KyotoSeikaSubject];
  /** The selected sticker's center, size and turn, in board pixels. */
  sticker: { x: number; y: number; w: number; h: number; r: number };
  /** The image's cut line, when the board has read it. */
  art: { outline?: string; width: number; height: number };
  board: { W: number; H: number };
  /** Whether its rotate knob hangs below it; absent on someone else's board. */
  knobBelow?: boolean;
  /** How much of the board's right edge the sticker tray takes. */
  trayEdge: number;
  reduced: boolean;
  onDone: () => void;
}

/**
 * A peek at the subjects of the sticker a tap just selected: one layer over the stickers, under the
 * toolbar, that takes no taps, its clouds placed once the toolbar beside the sticker has its spot.
 */
export function ThoughtLayer({
  subjects,
  sticker,
  art,
  board,
  knobBelow,
  trayEdge,
  reduced,
  onDone,
}: Props) {
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

  const { x, y, w, h, r } = sticker;
  const { W, H } = board;
  // After the toolbar's own layout effect, which puts it beside the sticker.
  useLayoutEffect(() => {
    const at = { x, y, w, h, r, cut };
    const el = layer.current;
    const face = el?.parentElement;
    if (!el || !face) return;
    const frame = el.getBoundingClientRect();
    const k = frame.width / (el.offsetWidth || frame.width || 1);
    const onBoard = (r: DOMRect): Box => ({
      left: (r.left - frame.left) / k,
      top: (r.top - frame.top) / k,
      right: (r.right - frame.left) / k,
      bottom: (r.bottom - frame.top) / k,
    });
    const shown = (found: Element | null) => {
      const r = found?.getBoundingClientRect();
      return r && r.width > 0 && r.height > 0 ? [onBoard(r)] : [];
    };
    const avoid = [
      ...(knobBelow === undefined ? [] : [knobBox(at, knobBelow)]),
      ...CLEAR_OF.flatMap((selector) => shown(face.querySelector(selector))),
      ...shown(document.querySelector(".tabs")),
    ];
    setSpot(
      thoughtPlacement({
        sticker: at,
        board: { W: W - trayEdge, H, top: THOUGHT_INSET_PX, bottom: H - THOUGHT_INSET_PX },
        shape: (toward) => thoughtLayout(subjects, "peek", toward),
        avoid,
      }),
    );
  }, [subjects, x, y, w, h, r, cut, W, H, knobBelow, trayEdge, language]);

  return (
    <div ref={layer} className="thought-layer" aria-hidden="true">
      {spot && (
        <SubjectThought
          subjects={subjects}
          size="peek"
          toward={spot.toward}
          at={{ x: spot.left, y: spot.top }}
          layout={spot.layout}
          reduced={reduced}
          onDone={onDone}
        />
      )}
    </div>
  );
}
