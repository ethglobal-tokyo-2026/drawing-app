import type { Mint } from "../deps.ts";

/**
 * NFT owner: the mint goes here, through sticker-chain's createStickerSealer, once Privy smart
 * wallets exist to mint to. Until then every sticker stays unminted (tokenId null), so Giving runs in
 * mock chain mode: server.ts passes no giftChain.
 */
export const mintStub: Mint = () => Promise.resolve(null);
