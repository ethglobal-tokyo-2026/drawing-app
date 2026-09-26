export const identity = {
  /** The developer slip's Privy account and gas check. Never translated. */
  developer: {
    /** An account row's Copy. Mid-sentence, `label` is the row's label in lower case. */
    copy: {
      button: "Copy",
      ariaLabel: "Copy the {{label}}",
      copied: "{{label}} copied",
      failed: "Couldn’t copy the {{label}}",
    },
    privyId: "Privy ID",
    boardAddress: "Board address",
    signInAddress: "Sign-in address",
    suiAddress: {
      label: "Sui address",
      /** In place of the address, when Privy couldn't make the Sui wallet. */
      failed: "Privy couldn’t make it: {{reason}}",
    },
    /** An address's link, which opens it on its chain's explorer. */
    onExplorer: "{{label}} {{address}} on {{explorer}}",
    explorer: {
      etherscan: "Etherscan, Ethereum Sepolia’s explorer",
      suiscan: "Suiscan, Sui Testnet’s explorer",
    },
    /** The proof that Privy's paymaster pays a smart-account transaction's gas. */
    sponsorshipCheck: {
      check: "Check sponsored gas",
      checking: "Checking sponsored gas…",
      waitingForSmartAccount: "Waiting for the smart account…",
      failed: "Gas check failed: {{reason}}",
      passed: "Sponsored with no ETH spent.",
      viewTransaction: "View transaction",
    },
  },
} as const;
