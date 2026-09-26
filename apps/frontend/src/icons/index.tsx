import {
  Compass,
  Eye,
  Fire,
  Gift,
  Handshake,
  Heart,
  Tag,
  TrayArrowDown,
  type IconProps,
} from "@phosphor-icons/react";

// The app's icons, all Phosphor: import them from here, never from Phosphor. An icon that carries one of
// the app's meanings goes by that meaning, so the same thing keeps the same icon on every screen; the
// rest keep Phosphor's own names.
export { DrawIcon } from "./DrawIcon";
export { StickerBoardIcon } from "./StickerBoardIcon";
export type { Icon, IconProps } from "@phosphor-icons/react";

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
/** Give: every way to give someone a sticker. */
export const GiveIcon = (props: IconProps) => <Gift aria-hidden focusable="false" {...props} />;
/** View: a sticker up close, in its detail. */
export const ViewIcon = (props: IconProps) => <Eye aria-hidden focusable="false" {...props} />;
/** Offer: asking for someone else's sticker, or offering them something for it. */
export const OfferIcon = (props: IconProps) => (
  <Handshake aria-hidden focusable="false" {...props} />
);
/** Remove: a sticker off the board and back into the tray. */
export const RemoveIcon = (props: IconProps) => (
  <TrayArrowDown aria-hidden focusable="false" {...props} />
);

// Icons with no meaning of their own in the app.
export {
  ArrowBendLeftUp,
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowRight,
  ArrowSquareOut,
  ArrowsLeftRight,
  ArrowUUpLeft,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  ChatCircleDots,
  Check,
  CheckFat,
  Circle,
  Clock,
  Eraser,
  HandHeart,
  HandPointing,
  PaintBrush,
  PaintBucket,
  PaperPlaneTilt,
  Pause,
  Play,
  Question,
  Sticker,
  Vibrate,
  WaveSine,
  Wind,
  X,
} from "@phosphor-icons/react";
