import {
  ArrowsOutCardinal,
  Checkerboard,
  Eye,
  Fire,
  Gift,
  Heart,
  MapTrifold,
  PenNib,
  SelectionBackground,
  Spinner,
  Sticker,
  Ticket,
  ToteSimple,
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
  <MapTrifold aria-hidden focusable="false" {...props} />
);
/** The Shop tab and ways into the Shop. */
export const ShopIcon = (props: IconProps) => (
  <ToteSimple aria-hidden focusable="false" {...props} />
);
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
/** Buying reserve tickets: every button that opens the reserve ticket checkout. */
export const BuyTicketsIcon = (props: IconProps) => (
  <Ticket aria-hidden focusable="false" {...props} />
);
/** Remove: a sticker off the board and back into the tray. */
export const RemoveIcon = (props: IconProps) => (
  <Sticker aria-hidden focusable="false" {...props} />
);
/** Arrange: the selected sticker's toolbar tile that opens its step tiles. */
export const ArrangeIcon = (props: IconProps) => (
  <ArrowsOutCardinal aria-hidden focusable="false" {...props} />
);
/**
 * Clear the sheet: the tool strip's clear tile. Phosphor's spinner, the ring Clip Studio Paint draws
 * for Clear; the app shows no loading spinner for it to be mistaken for.
 */
export const ClearSheetIcon = (props: IconProps) => (
  <Spinner aria-hidden focusable="false" {...props} />
);
/** Pencil only: the drawing screen's tile that switches the sheet between Pencil only and Pencil and finger. */
export const PencilOnlyIcon = (props: IconProps) => (
  <PenNib aria-hidden focusable="false" {...props} />
);
/**
 * Lock transparent pixels: the layer options bar's toggle. Phosphor's checkerboard, the mark
 * Photoshop, Krita and Clip Studio Paint share; its fill weight, shown while on, is a true checkerboard.
 */
export const LockTransparentPixelsIcon = (props: IconProps) => (
  <Checkerboard aria-hidden focusable="false" {...props} />
);
/**
 * Clip to layer below: the layer options bar's toggle. Phosphor's selection-background, a solid
 * square under a dashed one, which is Clip Studio Paint's own mark for clipping.
 */
export const ClipToLayerBelowIcon = (props: IconProps) => (
  <SelectionBackground aria-hidden focusable="false" {...props} />
);

// Icons with no meaning of their own in the app.
export {
  ArrowBendLeftUp,
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowRight,
  ArrowSquareOut,
  ArrowUUpLeft,
  At,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Check,
  CheckFat,
  Circle,
  Clock,
  Copy,
  DeviceRotate,
  Eraser,
  EyeSlash,
  HandHeart,
  HandPointing,
  Minus,
  PaintBrush,
  PaintBucket,
  PaperPlaneTilt,
  Pause,
  Play,
  Plus,
  Question,
  Receipt,
  SignOut,
  SkipForward,
  StarFour,
  Stop,
  Trash,
  Vibrate,
  WaveSine,
  Wind,
  X,
} from "@phosphor-icons/react";
