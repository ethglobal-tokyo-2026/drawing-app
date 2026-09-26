import { formatHandle } from "../stickers/format";

/**
 * The gift tag is printed, never typed. LINE's picker never tells the app who was picked, so a
 * gift sent through it names its giver; one given to an artist in the app names its recipient.
 */
export interface GiftTag {
  /** A key of the catalog's `giving.tag`. */
  label: "from" | "for";
  name: string;
}

export const giftTag = (fromHandle: string, toHandle?: string): GiftTag =>
  toHandle
    ? { label: "for", name: formatHandle(toHandle) }
    : { label: "from", name: formatHandle(fromHandle) };

/** The date printed on the tear tape: "SEALED 9.23". */
export const sealDate = (at: number): string => {
  const d = new Date(at);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};
