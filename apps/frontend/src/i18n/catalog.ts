/** A translation of an English section: the same keys, any of them missing until it's complete. */
export type Translation<T> = {
  readonly [K in keyof T]?: T[K] extends string ? string : Translation<T[K]>;
};
