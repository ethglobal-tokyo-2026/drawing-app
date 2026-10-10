import { useId, useLayoutEffect, useRef, type Ref } from "react";
import { useTranslation } from "../../i18n/react";
import { EASE_PEEL } from "../../ui/easing";
import { QrCode } from "../../ui/QrCode";
import { QuietLink } from "../../ui/QuietLink";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { shortAddress, type ChainAddress } from "./addresses";
import "./address-papers.css";
// Sui's droplet in Sui Blue, byte for byte from its brand kit (live.standards.site/sui-media-kit). Sui's
// rules forbid altering it, so the pin's head is the file itself: never recolored, outlined or glinted.
import suiDroplet from "./Logo_Sui_Droplet_Sui_Blue.svg";

interface Props {
  sui: ChainAddress;
  /** The board owner's name, on someone else's stat board; unset on your own. */
  whose?: string;
  /** Off the cork, held up in the address dialog. */
  lifted: boolean;
  /** The paper's face, which the dialog lifts off the cork and puts back. */
  paperRef: Ref<HTMLButtonElement>;
  onOpen: () => void;
}

/**
 * The QR code's side in px. The face's 16px of white around it is the quiet zone scanners need, more
 * than four of a Sui address's modules.
 */
const CODE_PX = 116;

/** Back on the cork, the paper presses down from a little proud of it and swings on its pin. */
function stickBack(face: Element) {
  face.animate([{ scale: "1.04" }, { scale: "1" }], {
    duration: 220,
    easing: EASE_PEEL,
  });
  face.animate(
    [
      { rotate: "0deg" },
      { rotate: "1.4deg", offset: 0.22 },
      { rotate: "-0.7deg", offset: 0.52 },
      { rotate: "0deg" },
    ],
    { duration: 700, easing: "cubic-bezier(.3,.6,.4,1)" },
  );
}

/** Where a QR code goes, until there's one to show: faint hatching and three finder squares. */
function CodePlaceholder() {
  return (
    <span className="address-papers__code address-papers__placeholder" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * A Sui address, yours or the board owner's, pinned on the cork as a QR code on white label paper
 * under Sui's pin. Once the address is known, the face opens it.
 */
export function AddressPapers({ sui, whose, lifted, paperRef, onOpen }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const note = useRef<HTMLDivElement>(null);
  const wasLifted = useRef(lifted);
  const glossId = useId();

  // Only on the way back: on the way up, the dialog's card covers the paper on the frame it hides.
  useLayoutEffect(() => {
    if (wasLifted.current === lifted) return;
    wasLifted.current = lifted;
    const face = note.current?.querySelector(":scope > .stat-board__paper");
    if (!lifted && !reduced && face) stickBack(face);
  }, [lifted, reduced]);

  const caption = (
    <>
      <span className="fine address-papers__caption">
        {t(($) => $.stickerBoard.addresses.sui.caption)}
      </span>
      <span className="fine address-papers__gloss keep-phrases" id={glossId}>
        {whose === undefined
          ? t(($) => $.stickerBoard.addresses.sui.gloss)
          : t(($) => $.stickerBoard.addresses.sui.theirs.gloss)}
      </span>
    </>
  );
  return (
    <div className="address-papers">
      <div className="stat-board__note address-papers__note" ref={note}>
        <img className="address-papers__pin" src={suiDroplet} alt="" draggable={false} />
        {sui.state === "ready" ? (
          <button
            ref={paperRef}
            type="button"
            className={`stat-board__paper address-papers__face${lifted ? " is-lifted" : ""}`}
            data-press
            aria-haspopup="dialog"
            aria-label={
              whose === undefined
                ? t(($) => $.stickerBoard.addresses.sui.open)
                : t(($) => $.stickerBoard.addresses.sui.theirs.open, { name: whose })
            }
            aria-describedby={glossId}
            onClick={onOpen}
          >
            <QrCode className="address-papers__code" value={sui.address} size={CODE_PX} />
            {caption}
            <span className="address-papers__address">{shortAddress(sui.address)}</span>
          </button>
        ) : (
          <div className="stat-board__paper address-papers__face">
            <CodePlaceholder />
            {caption}
            <span className="address-papers__status keep-phrases">
              {sui.state !== "loading"
                ? t(($) => $.stickerBoard.addresses.sui.didntLoad)
                : whose === undefined
                  ? t(($) => $.stickerBoard.addresses.sui.loading)
                  : t(($) => $.stickerBoard.addresses.sui.theirs.loading)}
            </span>
            {sui.state === "failed" && sui.retry && (
              <QuietLink className="address-papers__retry" onClick={sui.retry}>
                {t(($) => $.stickerBoard.addresses.tryAgain)}
              </QuietLink>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
