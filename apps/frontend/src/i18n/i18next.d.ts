import "i18next";
import type { Leaf } from "./catalog";
import type { strings } from "./strings";

/** A catalog's English, as i18next's types read it: `t` takes its keys and `{{variables}}` from these literals. */
type English<T> = {
  readonly [K in keyof T]: T[K] extends Leaf ? T[K]["en"] : English<T[K]>;
};

declare module "i18next" {
  interface CustomTypeOptions {
    enableSelector: true;
    resources: { translation: English<typeof strings> };
  }
}
