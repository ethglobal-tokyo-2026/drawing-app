const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });

/** "¥1,000". */
export const formatYen = (amount: number) => yen.format(amount);

/** What `units` JPYC base units are worth in yen, rounded down: one JPYC is one yen. */
export const yenForJpyc = (units: bigint, decimals: number) =>
  Number(units / 10n ** BigInt(decimals));
