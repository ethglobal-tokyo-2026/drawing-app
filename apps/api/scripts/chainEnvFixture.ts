import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/** Every setting deploy-api.sh sends the chain.env installer from deploy/.env, each in the shape the installer wants. */
export function chainEnvInput(): Record<string, string> {
  return {
    SUI_SERVER_PRIVATE_KEY: new Ed25519Keypair().getSecretKey(),
    SHINAMI_ACCESS_KEY: "test-shinami-key",
    PRIVY_APP_ID: "test-app",
    PRIVY_APP_SECRET: "test-privy-secret",
    LINE_MESSAGING_CHANNEL_ID: "2000000001",
    LINE_MESSAGING_CHANNEL_SECRET: "ab".repeat(16),
  };
}
