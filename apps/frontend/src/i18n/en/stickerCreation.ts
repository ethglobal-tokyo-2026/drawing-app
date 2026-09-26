export const stickerCreation = {
  /** The tool strip's tiles, named for assistive tech. */
  tools: {
    /** Names the strip. */
    label: "Tools",
    brush: "Brush",
    eraser: "Eraser",
    fill: "Fill",
    color: "Color",
    smoothing: "Smoothing",
  },
  /** The bar under the tools, named like its tile. */
  smoothingBar: {
    raw: "Raw",
    smooth: "Smooth",
  },
  history: {
    undo: "Undo",
    redo: "Redo",
  },
} as const;
