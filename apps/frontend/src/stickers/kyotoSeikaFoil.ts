/**
 * How far the Kyoto Seika Practice Mode foil's band reaches past the cut on a sticker this big, in
 * CSS px. The band is grown from the cut, not the server's mask.
 */
export const kyotoSeikaBandWidth = (w: number, h: number) => Math.max(2, 0.024 * Math.max(w, h));
