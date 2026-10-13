/** Display timing is an explicit hardware qualification, separate from functional regressions. */
export const checkStickerFrameBudget = process.env.STICKER_FRAME_BUDGET === "on";

/** A 60fps floor; recorded cadence still distinguishes 60Hz output from ProMotion output. */
export const stickerDisplayBudget = { p95Ms: 16.7, maximumMs: 50 } as const;

/** Remove subtraction noise such as 16.7000000000007 without changing the display budget. */
export const displayMilliseconds = (value: number) => Math.round(value * 1000) / 1000;
