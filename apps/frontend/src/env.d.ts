interface ImportMetaEnv {
  readonly VITE_LIFF_ID?: string;
  readonly VITE_LIFF_MOCK?: string;
  readonly VITE_DEV_SLIP?: string;
  readonly VITE_DEMO_PEOPLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
