import type { Me, Person } from "../shapes.ts";

export type AccountSelection = { userId: string; selectionVersion: string | null };
export type AuthenticatedSession = {
  authenticatedUserId: string;
  sessionId: string;
  expiresAt: Date;
};
export type ResolvedSession = AuthenticatedSession & {
  selectedUserId: string;
  selectionVersion: string | null;
};
export type SessionEnvelope = {
  me: Me;
  authenticated: Pick<Me, "id" | "lineUserId" | "lineDisplayName" | "linePictureUrl">;
  allowedSelections: Person[];
  selectionVersion: string | null;
  expectedPrivySubject: string;
  expectedSuiAddress: string | null;
  personSwitchMode: "off" | "verify" | "live";
};
export type PersonSwitchConfig = {
  mode: "off" | "verify" | "live";
  operatorUserId: string | null;
  hanaUserId: string | null;
};
