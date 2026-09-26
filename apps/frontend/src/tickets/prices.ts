const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });

/**
 * "¥1,000", with the half-width yen sign in every browser. Chromium formats Japanese yen with the full-width ￥
 * (U+FFE5), which Mona Sans doesn't have, so the sign fell back to another typeface; ¥ (U+00A5), which Safari
 * already writes, is Mona Sans's own.
 */
export const formatYen = (amount: number) =>
  yen
    .formatToParts(amount)
    .map((part) => (part.type === "currency" ? "¥" : part.value))
    .join("");

/** What `units` JPYC base units are worth in yen, rounded down: one JPYC is one yen. */
export const yenForJpyc = (units: bigint, decimals: number) =>
  Number(units / 10n ** BigInt(decimals));
