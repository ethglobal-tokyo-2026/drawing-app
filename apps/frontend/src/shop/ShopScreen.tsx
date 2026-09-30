import type { ReactNode } from "react";
import { useTranslation } from "../i18n/react";
import { useLight } from "../stickers/light";
import { useAddUnaddedPurchases } from "../tickets/unaddedPurchases";
import { Skeleton } from "../ui/Skeleton";
import { BrushStrokeSample } from "./BrushStrokeSample";
import type { BrushKind } from "./brushSamples";
import { ComingSoonShelf } from "./ComingSoonShelf";
import { FinishPreview, type BackingFoil, type Laminate } from "./FinishPreview";
import { ReserveTicketsHero } from "./ReserveTicketsHero";
import { ShopTicketPurchases } from "./ShopTicketPurchases";
import { useShopSticker, type ShopSticker } from "./shopSticker";
import { UnaddedPurchaseStrip } from "./UnaddedPurchaseStrip";
import "./ShopScreen.css";

/** A swatch's side, in CSS px. */
const SWATCH = 96;
const LAMINATES: readonly Laminate[] = ["gloss", "matte", "glitter", "prism"];
const BRUSHES: readonly BrushKind[] = ["brush", "marker", "fineliner", "pixelPen"];
const BACKING_FOILS: readonly BackingFoil[] = ["holo", "gold", "silver", "roseGold"];

/**
 * The Shop: reserve tickets, the one thing on sale, and your purchases of them, then shelves of
 * what's coming, each led by what you have now. The reserve tickets section's key opens the reserve
 * ticket checkout.
 */
export function ShopScreen({ onBuyReserveTickets }: { onBuyReserveTickets: () => void }) {
  const { t } = useTranslation();
  const sticker = useShopSticker();
  useLight(sticker !== null);
  // Paid packs whose tickets the server hadn't added are asked for again, so the count above is whole.
  useAddUnaddedPurchases();

  // Until your sticker is in, its swatches stay in outline, so no stand-in shows first.
  const onSticker = (preview: (s: ShopSticker) => ReactNode) =>
    sticker ? preview(sticker) : <Skeleton width={SWATCH} height={SWATCH} />;

  return (
    <div className="shop">
      <h1 className="shop__title">{t(($) => $.shop.title)}</h1>
      <UnaddedPurchaseStrip onOpen={onBuyReserveTickets} />
      <ReserveTicketsHero onBuy={onBuyReserveTickets} />
      <ShopTicketPurchases />
      <ComingSoonShelf
        title={t(($) => $.shop.shelves.laminates.title)}
        lead={t(($) => $.shop.shelves.laminates.lead)}
        items={LAMINATES.map((laminate) => ({
          id: laminate,
          name: t(($) => $.shop.shelves.laminates.items[laminate]),
          preview: onSticker((s) => (
            <FinishPreview sticker={s} side={SWATCH} finish={{ laminate }} />
          )),
        }))}
      />
      <ComingSoonShelf
        title={t(($) => $.shop.shelves.brushes.title)}
        lead={t(($) => $.shop.shelves.brushes.lead)}
        swatch="white"
        items={BRUSHES.map((kind) => ({
          id: kind,
          name: t(($) => $.shop.shelves.brushes.items[kind]),
          preview: <BrushStrokeSample kind={kind} side={SWATCH} />,
        }))}
      />
      <ComingSoonShelf
        title={t(($) => $.shop.shelves.backingFoils.title)}
        lead={t(($) => $.shop.shelves.backingFoils.lead)}
        items={BACKING_FOILS.map((foil) => ({
          id: foil,
          name: t(($) => $.shop.shelves.backingFoils.items[foil]),
          preview: onSticker((s) => <FinishPreview sticker={s} side={SWATCH} finish={{ foil }} />),
        }))}
      />
    </div>
  );
}
