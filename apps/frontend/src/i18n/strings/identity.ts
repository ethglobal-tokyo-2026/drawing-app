import type { Section } from "../catalog";

export const identity = {
  /** The developer slip's Privy account and gas check. Never translated. */
  developer: {
    /** An account row's Copy. Mid-sentence, `label` is the row's label in lower case. */
    copy: {
      button: { en: "Copy" },
      ariaLabel: { en: "Copy the {{label}}" },
      copied: { en: "{{label}} copied" },
      failed: { en: "Couldn’t copy the {{label}}. Select it above to copy it by hand." },
    },
    privyId: { en: "Privy ID" },
    boardAddress: { en: "Board address" },
    signInAddress: { en: "Sign-in address" },
    suiAddress: {
      label: { en: "Sui address" },
      /** In place of the address, when Privy couldn't make the Sui wallet. */
      failed: { en: "Privy couldn’t make it: {{reason}}" },
    },
    /** An address's link, which opens it on its chain's explorer. */
    onExplorer: { en: "{{label}} {{address}} on {{explorer}}" },
    explorer: {
      etherscan: { en: "Etherscan, Ethereum Sepolia’s explorer" },
      suiscan: { en: "Suiscan, Sui Testnet’s explorer" },
    },
    /** The proof that Privy's paymaster pays a smart-account transaction's gas. */
    sponsorshipCheck: {
      check: { en: "Check sponsored gas" },
      checking: { en: "Checking sponsored gas…" },
      waitingForSmartAccount: { en: "Waiting for the smart account…" },
      failed: { en: "Gas check failed: {{reason}}" },
      passed: { en: "Sponsored with no ETH spent." },
      viewTransaction: { en: "View transaction" },
    },
  },
} as const satisfies Section;
