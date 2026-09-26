import { MIST_PER_SUI } from "../payments/sui";

const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });
const sui = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

/** "¥1,000". */
export const formatYen = (amount: number) => yen.format(amount);

/** "0.333" SUI from MIST: two to three decimals, rounded up so a price never reads low. */
export function formatSui(mist: bigint): string {
  const step = MIST_PER_SUI / 1000n;
  const thousandths = (mist + step - 1n) / step;
  return sui.format(Number(thousandths) / 1000);
}

/** What `mist` is worth at `suiYen` yen per SUI, rounded down to the yen. */
export const yenForMist = (mist: bigint, suiYen: string) =>
  Math.floor((Number(mist) / Number(MIST_PER_SUI)) * Number(suiYen));
