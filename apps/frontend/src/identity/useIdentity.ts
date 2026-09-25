import { useLine, type LineState } from "../line/liff";
import { PROFILE } from "./profile";

export interface Identity {
  /** Shown after "@" on the name tag. */
  handle: string;
  displayName: string;
  pictureUrl?: string;
  /** Placeholder until ENS: derived from the name. */
  boardAddress: string;
  line: LineState;
}

/** "Aakash Taneja" → "aakash-taneja"; empty for names with no latin letters. */
const slug = (name: string) =>
  name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** The LINE identity when available, otherwise the placeholder profile. */
export function useIdentity(): Identity {
  const line = useLine();
  if (line.status === "ready") {
    const name = line.profile.displayName;
    return {
      handle: name,
      displayName: name,
      pictureUrl: line.profile.pictureUrl,
      boardAddress: `${slug(name) || PROFILE.username}.sketch.eth`,
      line,
    };
  }
  return {
    handle: PROFILE.username,
    displayName: PROFILE.displayName,
    boardAddress: PROFILE.boardAddress,
    line,
  };
}
