/**
 * How far the Kyoto Seika Practice Mode foil's band reaches past the cut on a sticker this big, in
 * CSS px: as sticker-foil.css grows it, since it's grown from the cut rather than the server's mask.
 */
export const kyotoSeikaBandWidth = (w: number, h: number) => Math.max(2, 0.024 * Math.max(w, h));
