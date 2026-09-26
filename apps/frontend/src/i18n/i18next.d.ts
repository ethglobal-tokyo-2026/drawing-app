import "i18next";
import type { en } from "./en";

declare module "i18next" {
  interface CustomTypeOptions {
    enableSelector: true;
    resources: { translation: typeof en };
  }
}
