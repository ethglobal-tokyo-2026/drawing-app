import { formatDuration, spokenDuration } from "./format";

/**
 * A drawing time in fine print, "4m 52s". Its units stay lowercase in capitalized fine print, where
 * "4M 52S" could read as millions, and screen readers hear it in words.
 */
export function Duration({ seconds }: { seconds: number }) {
  return (
    <span style={{ textTransform: "none" }}>
      <span aria-hidden="true">{formatDuration(seconds)}</span>
      <span className="visually-hidden">{spokenDuration(seconds)}</span>
    </span>
  );
}
