import { Eyes } from "@phosphor-icons/react";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { useIdentity } from "../identity/useIdentity";
import { PhotoSticker } from "../ui/PhotoSticker";
import "./TabBar.css";

export type Tab = "board" | "explore";

interface Props {
  /** None while drawing: Draw is the board's key, not a tab. */
  active?: Tab;
  onChange: (tab: Tab) => void;
}

/** Index tabs cut from label stock; the current one is stuck on in its full hue. */
export function TabBar({ active, onChange }: Props) {
  const me = useIdentity();
  const current = (tab: Tab) => (active === tab ? "page" : undefined);
  return (
    <nav className="tabs" aria-label="App sections">
      <button
        className="tab tab-board"
        data-press
        aria-current={current("board")}
        onClick={() => onChange("board")}
      >
        {me.pictureUrl ? (
          <PhotoSticker src={me.pictureUrl} name={me.displayName} size={24} />
        ) : (
          <StickerBoardIcon weight={active === "board" ? "fill" : "bold"} />
        )}
        <span>My board</span>
      </button>
      <button
        className="tab tab-explore"
        data-press
        aria-current={current("explore")}
        onClick={() => onChange("explore")}
      >
        <Eyes size={20} weight={active === "explore" ? "fill" : "bold"} />
        <span>Explore</span>
      </button>
    </nav>
  );
}
