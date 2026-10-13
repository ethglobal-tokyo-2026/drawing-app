import type { AccountSelection } from "@drawing-app/api/client";
import type { User } from "@privy-io/react-auth";
import { useMemo } from "react";
import { useSessionEnvelope } from "../api/sessionContext";
import { privySuiWallet } from "./privy";

export type PrivyAccount = AccountSelection & {
  expectedSubject: string;
  expectedSuiAddress: string | null;
};
export const matchesPrivySubject = (user: User | null, expectedSubject: string): boolean =>
  Boolean(
    user?.linkedAccounts.some(
      (account) => account.type === "custom_auth" && account.customUserId === expectedSubject,
    ),
  );
export const matchesPrivyAccount = (user: User | null, account: PrivyAccount): boolean => {
  const wallet = privySuiWallet(user);
  return (
    matchesPrivySubject(user, account.expectedSubject) &&
    Boolean(
      wallet &&
      (account.expectedSuiAddress === null || wallet.address === account.expectedSuiAddress),
    )
  );
};
export function usePrivyAccount(): PrivyAccount {
  const envelope = useSessionEnvelope();
  const { selectionVersion, expectedPrivySubject, expectedSuiAddress } = envelope;
  const userId = envelope.me.id;
  return useMemo(
    () => ({ userId, selectionVersion, expectedSubject: expectedPrivySubject, expectedSuiAddress }),
    [userId, selectionVersion, expectedPrivySubject, expectedSuiAddress],
  );
}
