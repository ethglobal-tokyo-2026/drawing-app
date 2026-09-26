import type { Tab } from "./TabBar";

export type View = Tab | "draw";

/** The screen a link opens. The LINE chat menu's tiles link to /draw and /explore; any other path is the board. */
export function viewFromPath(pathname: string): View {
  const [first] = pathname.split("/").filter(Boolean);
  if (first === "draw") return "draw";
  if (first === "explore") return "explore";
  return "board";
}
