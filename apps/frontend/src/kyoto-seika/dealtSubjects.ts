import { parseStored, personKey, readStored, writeStored } from "../ui/deviceStorage";

const keyFor = (userId: string) => personKey("kyotoSeika.dealt", userId);

/**
 * Every word dealt to `userId` on this phone, each once, longest ago first; none when they can't be
 * read. The deal keeps them all, so a kind's every word is dealt before any comes back.
 */
export function readDealtSubjects(userId: string): string[] {
  const { text } = readStored(
    keyFor(userId),
    "The Kyoto Seika Subjects dealt before can't be read on this device",
  );
  if (text === null) return [];
  const value = parseStored(text);
  if (Array.isArray(value) && value.every((word): word is string => typeof word === "string"))
    return value;
  console.error("The Kyoto Seika Subjects dealt before are unreadable, so none count:", text);
  return [];
}

/** Notes `words` as just dealt to `userId`: each moves to the end, as the one dealt last. */
export function keepDealt(userId: string, words: readonly string[]): void {
  const earlier = readDealtSubjects(userId).filter((word) => !words.includes(word));
  writeStored(
    keyFor(userId),
    JSON.stringify([...earlier, ...words]),
    "The Kyoto Seika Subjects just dealt can't be noted on this device, so the next deal may repeat them",
  );
}
