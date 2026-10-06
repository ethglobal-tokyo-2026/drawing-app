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

/** The embedded wallet Privy makes on `chainType` at sign-in. */
export function privyEmbeddedWallet(
  address: string,
  chainType: "sui" | "aptos" = "sui",
): User["linked_accounts"][number] {
  return {
    id: null,
    type: "wallet",
    address,
    chain_id: chainType,
    chain_type: chainType,
    connector_type: "embedded",
    delegated: false,
    imported: false,
    public_key: "00",
    recovery_method: "privy",
    wallet_client: "privy",
    wallet_client_type: "privy",
    wallet_index: 0,
    verified_at: 1,
    first_verified_at: null,
    latest_verified_at: null,
  };
}
