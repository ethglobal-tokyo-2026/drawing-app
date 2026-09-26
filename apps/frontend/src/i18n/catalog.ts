import type { Language } from "./language";

/** One string, in English and, once it's translated, Japanese. Without `ja`, Japanese shows the English. */
export interface Leaf {
  readonly en: string;
  readonly ja?: string;
}

/** The developer slip's strings, which stay English. */
interface EnglishOnly {
  readonly [key: string]: { readonly en: string; readonly ja?: never } | EnglishOnly;
}

/** A section of the catalog, or a group of strings within one. */
export type Section = { readonly [key: string]: Leaf | Section } & {
  readonly developer?: EnglishOnly;
};

/** One language's strings, in the catalog's shape, as i18next's resources hold them. */
export interface Strings {
  readonly [key: string]: string | Strings;
}

const isLeaf = (value: Leaf | Section): value is Leaf => typeof value.en === "string";

/**
 * i18next's resources for one language: every string the catalog has in it. A string with no
 * Japanese is left out, so i18next falls back to its English.
 */
export const resourcesIn = (catalog: Section, language: Language): Strings => {
  const resources: Record<string, string | Strings> = {};
  for (const [key, value] of Object.entries(catalog)) {
    if (isLeaf(value)) {
      const text = value[language];
      if (text !== undefined) resources[key] = text;
    } else {
      const group = resourcesIn(value, language);
      if (Object.keys(group).length) resources[key] = group;
    }
  }
  return resources;
};
