import { useLine } from "../line/liff";

export interface Identity {
  /** Shown after "@" until people pick handles. */
  handle: string;
  displayName: string;
  pictureUrl?: string;
  /** Placeholder until ENS: derived from the name. */
  boardAddress: string;
  /** Inside the LINE app, rather than a browser logged in through LINE Login. */
  inClient: boolean;
}

/** "Aakash Taneja" → "aakash-taneja"; empty for names with no latin letters. */
const slug = (name: string) =>
  name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** The person LINE logged in. Screens render inside LineGate, so LINE is always ready here. */
export function useIdentity(): Identity {
  const line = useLine();
  if (line.status !== "ready") {
    throw new Error(`useIdentity() needs a logged-in LINE user, but LINE is ${line.status}`);
  }
  const name = line.profile.displayName;
  return {
    handle: name,
    displayName: name,
    pictureUrl: line.profile.pictureUrl,
    boardAddress: `${slug(name) || "my-board"}.sketch.eth`,
    inClient: line.inClient,
  };
}
