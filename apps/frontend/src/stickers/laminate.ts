/** The Laminates, in the Shop's order: every sticker is sealed in gloss; the Shop previews the others. */
export const LAMINATE_FINISHES = ["gloss", "matte", "glitter", "prism"] as const;
export type LaminateFinish = (typeof LAMINATE_FINISHES)[number];
