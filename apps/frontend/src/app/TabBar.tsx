import { useTranslation } from "../i18n/react";
import { CaretLeft, ExploreIcon, ShopIcon, StickerBoardIcon } from "../icons";
import { useLargeScreen } from "../ui/largeScreen";
import { TabsLeadSlot } from "../ui/TabsLead";
import "./TabBar.css";

export type Tab = "board" | "explore" | "shop";

interface Props {
  active: Tab;
  /** Someone else's sticker board is open over Explore. */
  visiting?: boolean;
  onChange: (tab: Tab) => void;
}

/**
 * Index tabs cut from label stock; the current one is stuck on in its full hue. The drawing screen
 * has no tabs: Draw is the board's key, and the drawing screen's My board tile leads back. On a large
 * screen a board's key leads the row (ui/TabsLead.tsx).
 */
export function TabBar({ active, visiting = false, onChange }: Props) {
  const { t } = useTranslation();
  const large = useLargeScreen();
  const current = (tab: Tab) => (active === tab ? "page" : undefined);
  const weight = (tab: Tab) => (active === tab ? "fill" : "bold");
  // On a large screen someone's board leaves the way back to the lit Explore tab, which says so.
  const backToExplore = large && visiting && active === "explore";
  return (
    <>
      {/* A board's key on a large screen: before the tabs, as it stands left of them, and outside the
          strip's landmark, since it's a key and not a section. */}
      <TabsLeadSlot />
      <nav className="tabs" aria-label={t(($) => $.app.tabs.sections)}>
        <button
          className="tab tab-board"
          data-press
          aria-current={current("board")}
          onClick={() => onChange("board")}
        >
          <StickerBoardIcon size={20} weight={weight("board")} />
          <span>{t(($) => $.app.tabs.myBoard)}</span>
        </button>
        <button
          className="tab tab-explore"
          data-press
          aria-current={current("explore")}
          aria-label={backToExplore ? t(($) => $.app.tabs.backToExplore) : undefined}
          onClick={() => onChange("explore")}
        >
          {backToExplore ? (
            <CaretLeft size={20} weight="bold" />
          ) : (
            <ExploreIcon size={20} weight={weight("explore")} />
          )}
          <span>{t(($) => $.app.tabs.explore)}</span>
        </button>
        <button
          className="tab tab-shop"
          data-press
          aria-current={current("shop")}
          onClick={() => onChange("shop")}
        >
          <ShopIcon size={20} weight={weight("shop")} />
          <span>{t(($) => $.app.tabs.shop)}</span>
        </button>
      </nav>
    </>
  );
}
