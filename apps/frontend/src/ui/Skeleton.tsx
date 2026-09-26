import type { CSSProperties } from "react";
import "./skeleton.css";

interface Props {
  width: CSSProperties["width"];
  height: CSSProperties["height"];
  /** A circle, as for a photo sticker. */
  round?: boolean;
  className?: string;
  /** Where it sits, for a placeholder laid out by position rather than flow. */
  style?: CSSProperties;
}

/** One placeholder block in the shape of what's loading. Screen readers skip it. */
export function Skeleton({ width, height, round = false, className, style }: Props) {
  const classes = ["skeleton", round && "is-round", className].filter(Boolean).join(" ");
  return <span className={classes} style={{ ...style, width, height }} aria-hidden="true" />;
}
