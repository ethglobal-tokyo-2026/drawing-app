import { useLine } from "../line/liff";

export interface Identity {
  displayName: string;
  pictureUrl?: string;
  /** Inside the LINE app, rather than a browser logged in through LINE Login. */
  inClient: boolean;
}

/** The person LINE logged in. Screens render inside LineGate, so LINE is always ready here. */
export function useIdentity(): Identity {
  const line = useLine();
  if (line.status !== "ready") {
    throw new Error(`useIdentity() needs a logged-in LINE user, but LINE is ${line.status}`);
  }
  const name = line.profile.displayName;
  return {
    displayName: name,
    pictureUrl: line.profile.pictureUrl,
    inClient: line.inClient,
  };
}
