import type { Section } from "../catalog";

export const identity = {
  selection: {
    /** Wallet actions: Privy refused authentication; the failure remains until retry. */
    authFailed: {
      en: "Privy could not sign in to the selected account. Try again.",
      ja: "Privyで選択中のアカウントにログインできませんでした。もう一度お試しください。",
    },
    /** Wallet actions after selecting a person: Privy returned another subject. */
    subjectMismatch: {
      en: "Privy returned a different account. Reload before trying again.",
      ja: "Privyで別のアカウントが開かれました。再読み込みしてから、もう一度お試しください。",
    },
    /** Wallet actions after selecting a person: the selected account has another wallet address. */
    walletMismatch: {
      en: "The Sui wallet does not match the selected account. Reload before trying again.",
      ja: "Suiウォレットが選択中のアカウントと一致しません。再読み込みしてから、もう一度お試しください。",
    },
    /** Wallet actions after selecting a person: clearing Privy's previous session failed or timed out. */
    logoutFailed: {
      en: "Privy could not close the previous account. Try again.",
      ja: "Privyで前のアカウントを閉じられませんでした。もう一度お試しください。",
    },
    /** Wallet actions after selecting a person: creating the selected Sui wallet failed or timed out. */
    walletFailed: {
      en: "The selected account's Sui wallet could not be prepared. Try again.",
      ja: "選択中のアカウントのSuiウォレットを準備できませんでした。もう一度お試しください。",
    },
  },
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
