import { Compass, Fire, Heart, Tag, type IconProps } from "@phosphor-icons/react";

// The app's icons, one per meaning, all Phosphor. Import them from here, so the same thing keeps the same
// icon on every screen.
export { DrawIcon } from "./DrawIcon";
export { StickerBoardIcon } from "./StickerBoardIcon";

/** The Explore tab and ways into Explore. */
export const ExploreIcon = (props: IconProps) => (
  <Compass aria-hidden focusable="false" {...props} />
);
/** The Shop tab and ways into the Shop. */
export const ShopIcon = (props: IconProps) => <Tag aria-hidden focusable="false" {...props} />;
/** Gratitude, beside gratitude figures and on Send gratitude. Fill at every size: it's a mark, not a control. */
export const GratitudeIcon = (props: IconProps) => (
  <Heart weight="fill" aria-hidden focusable="false" {...props} />
);
/** The streak, beside streak figures. Fill at every size. */
export const StreakIcon = (props: IconProps) => (
  <Fire weight="fill" aria-hidden focusable="false" {...props} />
);
