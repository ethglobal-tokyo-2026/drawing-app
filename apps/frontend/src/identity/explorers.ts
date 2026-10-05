// Ethereum Sepolia's explorer, where the sticker contracts live.
const ETHERSCAN = "https://sepolia.etherscan.io";
// A Sui address is the same on every Sui network; the app tests on Testnet.
const SUISCAN = "https://suiscan.xyz/testnet";

export const etherscanAddressUrl = (address: string) => `${ETHERSCAN}/address/${address}`;

export const etherscanTxUrl = (hash: string) => `${ETHERSCAN}/tx/${hash}`;

export const suiscanAccountUrl = (address: string) => `${SUISCAN}/account/${address}`;

// A transaction lives on one network, unlike an address.
export const suiscanTxUrl = (network: string, digest: string) =>
  `https://suiscan.xyz/${network}/tx/${digest}`;
