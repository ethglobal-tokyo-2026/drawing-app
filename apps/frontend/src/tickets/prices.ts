import { MIST_PER_SUI } from "../payments/sui";

const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });

/** "¥1,000". */
export const formatYen = (amount: number) => yen.format(amount);

/** What `mist` is worth at `suiYen` yen per SUI, rounded down to the yen. */
export const yenForMist = (mist: bigint, suiYen: string) =>
  Math.floor((Number(mist) / Number(MIST_PER_SUI)) * Number(suiYen));
