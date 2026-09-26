import type { User } from "@privy-io/node";

/** SDK-shaped identity fixtures; network calls stay inside the real Privy client. */
export function privyUser(linkedAccounts: User["linked_accounts"] = []): User {
  return {
    id: "did:privy:test-artist",
    created_at: 1,
    has_accepted_terms: true,
    is_guest: false,
    linked_accounts: linkedAccounts,
    mfa_methods: [],
  };
}

export function privySmartWallet(
  address: string,
): Extract<User["linked_accounts"][number], { type: "smart_wallet" }> {
  return {
    type: "smart_wallet",
    address,
    smart_wallet_type: "safe",
    verified_at: 1,
    first_verified_at: null,
    latest_verified_at: null,
  };
}
