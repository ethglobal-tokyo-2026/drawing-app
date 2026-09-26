import { whenBoardQuiet } from "./boardComplete";

let played = () => {};
const chipsPlayed = new Promise<void>((resolve) => {
  played = resolve;
});

/** The first board's artist chips have played, or it had none to play, or it didn't load. */
export const markChipsPlayed = (): void => played();

/**
 * The board has settled: it's complete and has had its quiet second (whenBoardQuiet), and the artist
 * chips that greet it have played. Once per app open. Privy's SDK waits for this, so neither its
 * download nor its wallet frame competes with the board's stickers or motion.
 */
export async function whenBoardSettled(): Promise<void> {
  await Promise.all([whenBoardQuiet(), chipsPlayed]);
}
