/** The element of the sticker `id` under `root`: PlacedSticker names each by its sticker's id. */
export const stickerElIn = (root: ParentNode | null | undefined, id: string) =>
  root?.querySelector<HTMLElement>(`[data-sticker-id="${CSS.escape(id)}"]`) ?? null;
