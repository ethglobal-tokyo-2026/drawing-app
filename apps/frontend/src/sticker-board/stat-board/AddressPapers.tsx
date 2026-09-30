import { useId, useLayoutEffect, useRef, type Ref } from "react";
import { useTranslation } from "../../i18n/react";
import { EASE_PEEL } from "../../ui/easing";
import { QrCode } from "../../ui/QrCode";
import { QuietLink } from "../../ui/QuietLink";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { shortAddress, type Chain, type ChainAddress } from "./addresses";
import { ChainPin } from "./ChainPin";
import "./address-papers.css";

interface Props {
  board: ChainAddress;
  sui: ChainAddress;
  /** The paper off the cork, held up in the address dialog. */
  lifted: Chain | null;
  /** Each paper's face, which the dialog lifts off the cork and puts back. */
  paperRefs: Record<Chain, Ref<HTMLButtonElement>>;
  onOpen: (chain: Chain) => void;
}

/**
 * The QR code's side in px. The face's 16px of white around it is the quiet zone scanners need: four
 * modules of a board address's code, and more for a Sui address's finer one.
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

/** Your addresses, pinned on the cork as QR codes: the board address, and your Sui address. */
export function AddressPapers({ board, sui, lifted, paperRefs, onOpen }: Props) {
  return (
    <div className="address-papers">
      <AddressPaper
        chain="ethereum"
        address={board}
        lifted={lifted === "ethereum"}
        paperRef={paperRefs.ethereum}
        onOpen={() => onOpen("ethereum")}
      />
      <AddressPaper
        chain="sui"
        address={sui}
        lifted={lifted === "sui"}
        paperRef={paperRefs.sui}
        onOpen={() => onOpen("sui")}
      />
    </div>
  );
}

interface PaperProps {
  chain: Chain;
  address: ChainAddress;
  lifted: boolean;
  paperRef: Ref<HTMLButtonElement>;
  onOpen: () => void;
}

/** One address on white label paper under its chain's pin. Once the address is known, the face opens it. */
function AddressPaper({ chain, address, lifted, paperRef, onOpen }: PaperProps) {
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
        {t(($) => $.stickerBoard.addresses[chain].caption)}
      </span>
      <span className="fine address-papers__chain">
        {t(($) => $.stickerBoard.addresses[chain].network)}
      </span>
      <span className="fine address-papers__gloss" id={glossId}>
        {t(($) => $.stickerBoard.addresses[chain].gloss)}
      </span>
    </>
  );
  return (
    <div
      className={`stat-board__note address-papers__note address-papers__note--${chain}`}
      ref={note}
    >
      <ChainPin chain={chain} className="address-papers__pin" />
      {address.state === "ready" ? (
        <button
          ref={paperRef}
          type="button"
          className={`stat-board__paper address-papers__face${lifted ? " is-lifted" : ""}`}
          data-press
          aria-haspopup="dialog"
          aria-label={t(($) => $.stickerBoard.addresses[chain].open)}
          aria-describedby={glossId}
          onClick={onOpen}
        >
          <QrCode className="address-papers__code" value={address.address} size={CODE_PX} />
          {caption}
          <span className="address-papers__address">{shortAddress(address.address)}</span>
        </button>
      ) : (
        <div className="stat-board__paper address-papers__face">
          <CodePlaceholder />
          {caption}
          <span className="address-papers__status keep-phrases">
            {address.state === "loading"
              ? t(($) => $.stickerBoard.addresses[chain].loading)
              : t(($) => $.stickerBoard.addresses[chain].didntLoad)}
          </span>
          {address.state === "failed" && address.retry && (
            <QuietLink className="address-papers__retry" onClick={address.retry}>
              {t(($) => $.stickerBoard.addresses.tryAgain)}
            </QuietLink>
          )}
        </div>
      )}
    </div>
  );
}
