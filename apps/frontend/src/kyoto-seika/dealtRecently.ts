import { parseStored, personKey, readStored, writeStored } from "../ui/deviceStorage";

/** How many of the words dealt on this phone a deal steers clear of. */
export const RECENT_DEALT = 40;

const keyFor = (userId: string) => personKey("kyotoSeika.dealt", userId);

/** The words dealt to `userId` on this phone lately, newest last; none when they can't be read. */
export function readDealtRecently(userId: string): string[] {
  const { text } = readStored(
    keyFor(userId),
    "The Kyoto Seika Subjects dealt lately can't be read on this device",
  );
  if (text === null) return [];
  const value = parseStored(text);
  if (Array.isArray(value) && value.every((word): word is string => typeof word === "string"))
    return value;
  console.error("The Kyoto Seika Subjects dealt lately are unreadable, so none count:", text);
  return [];
}

/** Notes `words` as just dealt to `userId`, keeping the newest RECENT_DEALT. */
export function keepDealt(userId: string, words: readonly string[]): void {
  const earlier = readDealtRecently(userId).filter((word) => !words.includes(word));
  writeStored(
    keyFor(userId),
    JSON.stringify([...earlier, ...words].slice(-RECENT_DEALT)),
    "The Kyoto Seika Subjects just dealt can't be noted on this device, so the next deal may repeat them",
  );
}
