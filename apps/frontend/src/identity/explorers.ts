// Ethereum Sepolia's explorer, where the sticker contracts live.
const ETHERSCAN = "https://sepolia.etherscan.io";
// A Sui address is the same on every Sui network; the app tests on Testnet.
const SUISCAN = "https://suiscan.xyz/testnet";

export const etherscanAddressUrl = (address: string) => `${ETHERSCAN}/address/${address}`;

export const etherscanTxUrl = (hash: string) => `${ETHERSCAN}/tx/${hash}`;

// The ENS app on Sepolia, where names under croquis.eth show their records.
const ENS_APP = "https://sepolia.app.ens.domains";

export const ensAppUrl = (name: string) => `${ENS_APP}/${name}`;

export const suiscanAccountUrl = (address: string) => `${SUISCAN}/account/${address}`;
