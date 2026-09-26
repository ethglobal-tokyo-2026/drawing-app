import "i18next";
import type { English } from "./catalog";
import type { en } from "./en";
import type { strings } from "./strings";

declare module "i18next" {
  interface CustomTypeOptions {
    enableSelector: true;
    resources: { translation: typeof en & English<typeof strings> };
  }
}
