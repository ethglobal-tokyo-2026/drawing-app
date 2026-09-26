/**
 * The gift tag is printed, never typed. LINE's picker never tells the app who was picked,
 * so a card sent through it names its giver instead of its recipient.
 */
export interface GiftTag {
  label: "From";
  name: string;
}

export const giftTag = (handle: string): GiftTag => ({
  label: "From",
  name: `@${handle.replace(/^@+/, "")}`,
});

/** The date printed on the tear tape: "SEALED 9.23". */
export const sealDate = (at: number): string => {
  const d = new Date(at);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};
