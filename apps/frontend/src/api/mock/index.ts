import type { ApiClient } from "../apiClient";
import { boardOverlayWith } from "./board";
import { givingOverlay, receivedGifts } from "./giving";
import { receivedDemoStickers, receivingOverlay } from "./receiving";

/** One feature's fixtures, over the client beneath: the methods it answers itself. */
export type Overlay = (below: ApiClient) => Partial<ApiClient>;

/** Later overlays see the earlier ones: the board reads what Receiving and Giving did. */
const OVERLAYS: Overlay[] = [
  receivingOverlay,
  givingOverlay,
  boardOverlayWith({ receivedStickers: receivedDemoStickers, receivedGifts }),
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The dev server's client: `base` (this device's data) with each feature's fixtures over it. Every
 * answer comes after `latencyMs`, so loading states show.
 */
export function createMockApi({
  base,
  latencyMs = 250,
}: {
  base: ApiClient;
  latencyMs?: number;
}): ApiClient {
  const client = OVERLAYS.reduce<ApiClient>(
    (below, overlay) => ({ ...below, ...overlay(below) }),
    base,
  );
  const later =
    <A extends unknown[], R>(call: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      await wait(latencyMs);
      return call(...args);
    };
  return {
    stickerBoard: later(client.stickerBoard),
    saveStickerPlacement: later(client.saveStickerPlacement),
    markTraySeen: later(client.markTraySeen),
    stickerDetail: later(client.stickerDetail),
    pendingGifts: later(client.pendingGifts),
    previewGift: later(client.previewGift),
    receiveGift: later(client.receiveGift),
  };
}
