import type { Mint } from "../deps.ts";

/** Explicit local mock mode leaves stickers unminted. */
export const mintStub: Mint = () => Promise.resolve(null);
