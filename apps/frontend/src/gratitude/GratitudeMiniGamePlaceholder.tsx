import { X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { StickerUrls } from "../stickers/stickerUrls";
import { LabelButton } from "../ui/LabelButton";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import "./gratitude-placeholder.css";

/** What the Mini-game takes: the sticker, who gave it, and the gift being thanked. */
export interface GratitudeMiniGameProps {
  giftId: string;
  sticker: {
    id: string;
    no: number;
    timeUsed: number;
    createdAt: number;
    urls: StickerUrls;
    width: number;
    height: number;
  };
  giver: { handle: string; displayName: string; pictureUrl?: string };
  onClose: () => void;
}

/** Stands in for the gratitude Mini-game while it's built, showing what it will be handed. */
export function GratitudeMiniGamePlaceholder({ onClose, ...handed }: GratitudeMiniGameProps) {
  const root = useRef<HTMLDivElement>(null);
  useFocusTrap(root, { onEscape: onClose });
  useBackToClose(true, onClose);

  useEffect(() => {
    const was = document.title;
    document.title = "Send gratitude";
    return () => {
      document.title = was;
    };
  }, []);

  const screen = (
    <div ref={root} className="gratitude-placeholder" role="dialog" aria-label="Send gratitude">
      <h2 className="title-label">The gratitude Mini-game is being built</h2>
      <p className="gratitude-placeholder__note">It will be handed this:</p>
      <pre className="gratitude-placeholder__data">{JSON.stringify(handed, null, 2)}</pre>
      <LabelButton block icon={<X />} onClick={onClose}>
        Close
      </LabelButton>
    </div>
  );
  const phone = document.querySelector<HTMLElement>(".phone");
  return phone ? createPortal(screen, phone) : screen;
}
