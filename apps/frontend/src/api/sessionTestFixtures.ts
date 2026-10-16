import type { AccountSelection, Me, SessionEnvelope } from "@drawing-app/api/client";
/** An ordinary authenticated envelope; overrides model operator selection in tests. */
export function sessionEnvelope(me: Me, overrides: Partial<SessionEnvelope> = {}): SessionEnvelope {
  return {
    me,
    authenticated: me,
    allowedSelections: [],
    selectionVersion: null,
    expectedPrivySubject: me.lineUserId ?? me.id,
    expectedSuiAddress: null,
    personSwitchMode: "off",
    marksKyotoSeikaSubjects: false,
    ...overrides,
  };
}
export const accountSelection = (
  userId: string,
  selectionVersion: string | null = null,
): AccountSelection => ({ userId, selectionVersion });
