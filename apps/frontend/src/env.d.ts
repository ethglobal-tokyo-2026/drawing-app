interface ImportMetaEnv {
  readonly VITE_LIFF_ID?: string;
  readonly VITE_LIFF_MOCK?: string;
  readonly VITE_GIFT_MESSAGE_HERO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
