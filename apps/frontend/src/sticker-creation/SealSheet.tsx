import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { CheckFat } from "../icons";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
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
import { BORDER_UNITS } from "./sealing/dieCut";
import { prepareSealPreview } from "./sealing/sealPreview";
import "./SealSheet.css";

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
  /** A new canvas of what the sheet shows now, which the preview inspects and lets go. */
  ink: () => HTMLCanvasElement | null;
  /** The ink's device px per sheet unit; null while the sheet has no frame, and so no ink. */
  density: () => number | null;
  onNsfwChange: (on: boolean) => void;
  onSeal: () => void;
  onNotYet: () => void;
  onStartOver: () => void;
}

type PreviewStatus = "checking" | "ready" | "empty" | "failed";

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
  onStartOver,
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
  const previewMessage = useRef<HTMLDivElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<PreviewStatus>("checking");
  const [attempt, setAttempt] = useState(0);
  const focusAfterPreparation = useRef(false);
  const previousStatus = useRef<PreviewStatus>(status);
  const wasOpen = useRef(open);
  const focusAfterOpening = useRef(open);
  const [previewOpen, setPreviewOpen] = useState(open);
  // A reopened sheet starts with checking before its controls or the Sheet trap commit.
  if (open !== previewOpen) {
    setPreviewOpen(open);
    if (open) setStatus("checking");
  }
  const onPrepared = useCallback((result: PreviewStatus) => {
    const active = document.activeElement;
    focusAfterPreparation.current =
      active === previewMessage.current ||
      active === retry.current ||
      (active !== null && switchRow.current?.contains(active)) === true;
    setStatus(result);
  }, []);
  const focusSafe = (result: PreviewStatus, expired: boolean) => {
    const destination =
      result === "ready"
        ? switchRow.current?.querySelector("input")
        : expired || result === "checking"
          ? previewMessage.current
          : result === "empty"
            ? notYet.current
            : retry.current;
    destination?.focus({ preventScroll: true });
  };
  // If a result replaces the focused checking message, put focus on a safe action.
  useLayoutEffect(() => {
    if (open && !wasOpen.current) focusAfterOpening.current = true;
    if (!open) focusAfterOpening.current = false;
    wasOpen.current = open;
    if (
      open &&
      status !== "checking" &&
      (status !== previousStatus.current || focusAfterOpening.current) &&
      (focusAfterOpening.current ||
        focusAfterPreparation.current ||
        document.activeElement === previewMessage.current)
    ) {
      focusAfterPreparation.current = false;
      focusAfterOpening.current = false;
      focusSafe(status, timeUp);
    }
    previousStatus.current = status;
  }, [open, status, timeUp]);
  // Focus on Not yet as it goes; at 0:00 a non-ready preview offers only its message.
  useLayoutEffect(() => {
    if (timeUp && notYet.current && document.activeElement === notYet.current)
      focusSafe(status, true);
  }, [timeUp, status]);
  const retryPreview = () => {
    previewMessage.current?.focus({ preventScroll: true });
    setStatus("checking");
    setAttempt((last) => last + 1);
  };
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
        <div className={`seal-sheet__body ${status !== "ready" ? "is-without-preview" : ""}`}>
          <SealPreview
            open={open}
            nsfw={nsfw}
            kyotoSeika={subjects !== null}
            ink={ink}
            density={density}
            status={status}
            attempt={attempt}
            onPrepared={onPrepared}
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
            {status !== "ready" && (
              <div
                ref={previewMessage}
                className="seal-sheet__preview-status"
                role="status"
                tabIndex={0}
                data-autofocus={timeUp || status === "checking" ? true : undefined}
              >
                <p>
                  {status === "checking"
                    ? t(($) => $.stickerCreation.sealSheet.preparing)
                    : status === "empty"
                      ? t(($) => $.stickerCreation.sealSheet.empty)
                      : t(($) => $.stickerCreation.sealSheet.previewFailed)}
                </p>
                {status === "empty" && !timeUp && (
                  <p>{t(($) => $.stickerCreation.sealSheet.emptyHelp)}</p>
                )}
                {timeUp && status !== "checking" && (
                  <p>{t(($) => $.stickerCreation.sealSheet.discardHelp)}</p>
                )}
              </div>
            )}
            {status === "ready" && (
              <label ref={switchRow} className="seal-sheet__switch">
                <span aria-hidden="true">{t(($) => $.stickerCreation.sealSheet.nsfw)}</span>
                <Switch
                  checked={nsfw}
                  data-autofocus
                  aria-label={t(($) => $.stickerCreation.sealSheet.nsfwLabel)}
                  onChange={onNsfwChange}
                />
              </label>
            )}
          </div>
        </div>
      }
    >
      <p className="visually-hidden" role="status">
        {turned ? words : ""}
      </p>
      <div className="seal-sheet__foot">
        <Key
          className="seal-sheet__key"
          icon={<CheckFat weight="fill" />}
          disabled={status !== "ready"}
          onClick={() => {
            if (status === "ready") onSeal();
          }}
        >
          {t(($) => $.stickerCreation.sealSheet.seal)}
        </Key>
        {status === "failed" && (
          <QuietLink
            ref={retry}
            className="seal-sheet__retry"
            data-autofocus={!timeUp || undefined}
            onClick={retryPreview}
          >
            {t(($) => $.stickerCreation.sealSheet.retryPreview)}
          </QuietLink>
        )}
        {timeUp && (status === "empty" || status === "failed") && (
          <QuietLink className="seal-sheet__start-over" onClick={onStartOver}>
            {t(($) => $.stickerCreation.seal.startOver)}
          </QuietLink>
        )}
        {(!timeUp || turned) && (
          <div className="seal-sheet__not-yet-slot" inert={timeUp}>
            <QuietLink
              ref={notYet}
              className="seal-sheet__not-yet"
              data-autofocus={!timeUp && status === "empty" ? true : undefined}
              onClick={onNotYet}
            >
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
  status,
  attempt,
  onPrepared,
}: Pick<Props, "open" | "nsfw" | "ink" | "density"> & {
  kyotoSeika: boolean;
  status: PreviewStatus;
  attempt: number;
  onPrepared: (status: PreviewStatus) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Drawn as the sheet opens; the drawing can't change while it's up.
  useLayoutEffect(() => {
    const target = canvas.current;
    if (!open || !target) return;
    let copy: HTMLCanvasElement | null = null;
    try {
      const perUnit = density();
      if (perUnit === null || !Number.isFinite(perUnit) || perUnit <= 0)
        throw new Error("The seal preview has no valid sheet density");
      copy = ink();
      if (!copy || copy.width <= 0 || copy.height <= 0)
        throw new Error("The seal preview has no valid ink canvas");
      onPrepared(prepareSealPreview(target, copy, BORDER_UNITS * perUnit));
    } catch (error) {
      console.error("The seal sheet's preview couldn't be drawn", error);
      onPrepared("failed");
    } finally {
      if (copy) releaseCanvas(copy);
    }
  }, [open, ink, density, attempt, onPrepared]);
  const tone = madeFoil({ nsfw, kyotoSeika });
  return (
    <div className="seal-preview" aria-hidden="true" hidden={status !== "ready"}>
      <span className="seal-preview__sticker">
        {/* Keyed by tone, so marking 18+ lays the pink foil on fresh. */}
        {tone && <StickerFoil key={tone} size="board" tone={tone} turn={TURN_DEG} />}
        <canvas ref={canvas} className="seal-preview__ink" />
      </span>
    </div>
  );
}
