import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { CheckFat } from "../icons";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/react";
import { spokenSubject } from "../kyoto-seika/spokenSubject";
import { SubjectPair } from "../kyoto-seika/SubjectPair";
import { madeFoil } from "../stickers/madeFoil";
import { StickerFoil } from "../stickers/StickerFoil";
import { Key } from "../ui/Key";
import { QuietLink } from "../ui/QuietLink";
import { releaseCanvas } from "../ui/releaseCanvas";
import { Sheet } from "../ui/Sheet";
import { Switch } from "../ui/Switch";
import { context2d } from "./canvas/context2d";
import { BORDER_UNITS } from "./sealing/dieCut";
import "./SealSheet.css";

/** The ink's bounds are found on a copy this many pixels on its long side: the sheet is millions. */
const SCAN_PX = 192;
/** The preview's long side in device pixels, enough for a sharp 140px box on a 3× phone. */
const PREVIEW_PX = 420;
/** The preview's turn, as a sticker's on a board, which the foil's glint undoes. */
const TURN_DEG = -3;

interface Props {
  open: boolean;
  /** The clock reached 0:00: pencils down, so nothing leads back to the drawing. */
  timeUp: boolean;
  /** The sticker seals 18+. */
  nsfw: boolean;
  /** The pair a sheet in Kyoto Seika Practice Mode was dealt, which the sticker keeps; null on a regular sheet. */
  subjects: readonly [KyotoSeikaSubject, KyotoSeikaSubject] | null;
  /** A copy of the ink as it is now, which the preview lets go. */
  ink: () => HTMLCanvasElement | null;
  /** The ink's device px per sheet unit; null while the sheet has no frame, and so no ink. */
  density: () => number | null;
  onNsfwChange: (on: boolean) => void;
  onSeal: () => void;
  onNotYet: () => void;
}

/**
 * The seal sheet: the sticker as it will be, the 18+ switch, and Seal, the screen's one key while
 * it's up. Not yet closes it back to the drawing, until time's up. A sheet in Kyoto Seika Practice
 * Mode shows its pair, and its time's up is the proctor's やめ, in the deal's hand lettering. On a
 * large screen it's a card in the middle, over a scrim and closed by a swipe down its head.
 */
export function SealSheet({
  open,
  timeUp,
  nsfw,
  subjects,
  ink,
  density,
  onNsfwChange,
  onSeal,
  onNotYet,
}: Props) {
  const { t } = useTranslation();
  const lettered = timeUp && subjects !== null;
  const words = !timeUp
    ? t(($) => $.stickerCreation.sealSheet.title)
    : lettered
      ? t(($) => $.stickerCreation.sealSheet.pencilsDown)
      : t(($) => $.stickerCreation.sealSheet.timeUp);
  // Time's up while the sheet is open turns it in place: Not yet's slot fades rather than closing up,
  // so the sheet keeps its height, and the new title takes a beat and is announced.
  const [offeredNotYet, setOfferedNotYet] = useState(false);
  if (open && !timeUp && !offeredNotYet) setOfferedNotYet(true);
  if (!open && offeredNotYet) setOfferedNotYet(false);
  const turned = timeUp && offeredNotYet;
  const notYet = useRef<HTMLButtonElement>(null);
  const switchRow = useRef<HTMLLabelElement>(null);
  // Focus on Not yet as it goes moves to the switch, never to Seal, so Enter never seals blind.
  useLayoutEffect(() => {
    if (timeUp && notYet.current && document.activeElement === notYet.current)
      switchRow.current?.querySelector("input")?.focus({ preventScroll: true });
  }, [timeUp]);
  // On a large screen its scrim dims the whole drawing screen, the foot row's My board tile included.
  return (
    <Sheet
      label={words}
      open={open}
      closable={!timeUp}
      card
      scrim
      className={`seal-sheet keep-phrases ${timeUp ? "is-time-up" : ""}`}
      onClose={onNotYet}
      head={
        <div className="seal-sheet__body">
          <SealPreview
            open={open}
            nsfw={nsfw}
            kyotoSeika={subjects !== null}
            ink={ink}
            density={density}
          />
          <div className="seal-sheet__side">
            {/* Turned in place, the title it had stays unseen in the same cell, so a shorter one
                keeps the sheet's height. */}
            <div className="seal-sheet__titles">
              {turned && (
                <span className="seal-sheet__title is-outgoing" aria-hidden="true">
                  {t(($) => $.stickerCreation.sealSheet.title)}
                </span>
              )}
              <h2
                key={words}
                className={`seal-sheet__title ${lettered ? "is-lettered" : ""} ${turned ? "is-turned" : ""}`}
              >
                {words}
              </h2>
            </div>
            {subjects && (
              <p className="seal-sheet__pair">
                <SubjectPair subjects={subjects} />
                <span className="visually-hidden">
                  {t(($) => $.kyotoSeika.pair.spoken, {
                    first: spokenSubject(subjects[0]),
                    second: spokenSubject(subjects[1]),
                  })}
                </span>
              </p>
            )}
            <label ref={switchRow} className="seal-sheet__switch">
              <span aria-hidden="true">{t(($) => $.stickerCreation.sealSheet.nsfw)}</span>
              <Switch
                checked={nsfw}
                data-autofocus
                aria-label={t(($) => $.stickerCreation.sealSheet.nsfwLabel)}
                onChange={onNsfwChange}
              />
            </label>
          </div>
        </div>
      }
    >
      <p className="visually-hidden" role="status">
        {turned ? words : ""}
      </p>
      <div className="seal-sheet__foot">
        <Key className="seal-sheet__key" icon={<CheckFat weight="fill" />} onClick={onSeal}>
          {t(($) => $.stickerCreation.sealSheet.seal)}
        </Key>
        {(!timeUp || turned) && (
          <div className="seal-sheet__not-yet-slot" inert={timeUp}>
            <QuietLink ref={notYet} className="seal-sheet__not-yet" onClick={onNotYet}>
              {t(($) => $.stickerCreation.sealSheet.notYet)}
            </QuietLink>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/**
 * The drawing on white, cropped to its ink with the die-cut's white border round it, so it opens at
 * once: nothing waits on the cut. Its edge wears the foil the sticker will: pink on an 18+ sticker,
 * else the Kyoto Seika Practice Mode foil on a sheet in that mode.
 */
function SealPreview({
  open,
  nsfw,
  kyotoSeika,
  ink,
  density,
}: Pick<Props, "open" | "nsfw" | "ink" | "density"> & { kyotoSeika: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Drawn as the sheet opens; the drawing can't change while it's up.
  useLayoutEffect(() => {
    const target = canvas.current;
    if (!open || !target) return;
    const perUnit = density();
    if (perUnit === null) return;
    const copy = ink();
    if (!copy) return;
    try {
      drawPreview(target, copy, BORDER_UNITS * perUnit);
    } catch (error) {
      // The preview is only a picture: the sheet still seals without it.
      console.error("The seal sheet's preview couldn't be drawn", error);
    } finally {
      releaseCanvas(copy);
    }
  }, [open, ink, density]);
  const tone = madeFoil({ nsfw, kyotoSeika });
  return (
    <div className="seal-preview" aria-hidden="true">
      <span className="seal-preview__sticker">
        {/* Keyed by tone, so marking 18+ lays the pink foil on fresh. */}
        {tone && <StickerFoil key={tone} size="board" tone={tone} turn={TURN_DEG} />}
        <canvas ref={canvas} className="seal-preview__ink" />
      </span>
    </div>
  );
}

/**
 * Paints the ink's drawn part on white into `target`, `border` ink px of white round it, at most
 * PREVIEW_PX on its long side.
 */
function drawPreview(target: HTMLCanvasElement, ink: HTMLCanvasElement, border: number) {
  const bounds = inkBounds(ink) ?? { x: 0, y: 0, w: ink.width, h: ink.height };
  const pad = Math.round(border);
  const crop = {
    x: bounds.x - pad,
    y: bounds.y - pad,
    w: bounds.w + pad * 2,
    h: bounds.h + pad * 2,
  };
  const k = Math.min(1, PREVIEW_PX / Math.max(crop.w, crop.h));
  target.width = Math.max(1, Math.round(crop.w * k));
  target.height = Math.max(1, Math.round(crop.h * k));
  const g = context2d(target);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, target.width, target.height);
  // Only the part of the crop on the ink is drawn: WebKit draws nothing from a source rectangle past
  // its canvas's edge.
  const sx = Math.max(0, crop.x);
  const sy = Math.max(0, crop.y);
  const ex = Math.min(ink.width, crop.x + crop.w);
  const ey = Math.min(ink.height, crop.y + crop.h);
  if (ex <= sx || ey <= sy) return;
  g.drawImage(
    ink,
    sx,
    sy,
    ex - sx,
    ey - sy,
    (sx - crop.x) * k,
    (sy - crop.y) * k,
    (ex - sx) * k,
    (ey - sy) * k,
  );
}

/** Where the ink has anything drawn, in its own pixels, or null when nothing is. */
function inkBounds(ink: HTMLCanvasElement) {
  const scale = Math.min(1, SCAN_PX / Math.max(ink.width, ink.height, 1));
  const w = Math.max(1, Math.round(ink.width * scale));
  const h = Math.max(1, Math.round(ink.height * scale));
  const scan = document.createElement("canvas");
  scan.width = w;
  scan.height = h;
  try {
    const g = context2d(scan, { willReadFrequently: true });
    g.drawImage(ink, 0, 0, w, h);
    const { data } = g.getImageData(0, 0, w, h);
    let left = w;
    let top = h;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] === 0) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < 0) return null;
    return {
      x: left / scale,
      y: top / scale,
      w: (right - left + 1) / scale,
      h: (bottom - top + 1) / scale,
    };
  } finally {
    releaseCanvas(scan);
  }
}
