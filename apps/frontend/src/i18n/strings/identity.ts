import type { Section } from "../catalog";

export const identity = {
  /** The developer slip's Privy account. Never translated. */
  developer: {
    /** An account row's Copy. Mid-sentence, `label` is the row's label in lower case. */
    copy: {
      button: { en: "Copy" },
      ariaLabel: { en: "Copy the {{label}}" },
      copied: { en: "{{label}} copied" },
      failed: { en: "Couldn’t copy the {{label}}. Select it above to copy it by hand." },
    },
    privyId: { en: "Privy ID" },
    suiAddress: {
      label: { en: "Sui address" },
      /** In place of the address, when Privy couldn't make the Sui wallet. */
      failed: { en: "Privy couldn’t make it: {{reason}}" },
    },
    /** An address's link, which opens it on its chain's explorer. */
    onExplorer: { en: "{{label}} {{address}} on {{explorer}}" },
    explorer: {
      suiscan: { en: "Suiscan, Sui Testnet’s explorer" },
    },
  },
} as const satisfies Section;
