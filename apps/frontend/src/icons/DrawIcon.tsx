import draw from "@material-symbols/svg-700/outlined/draw-fill.svg?raw";
import { IconSvg, type IconProps } from "./IconSvg";

/** Every Draw action. The one icon from outside Phosphor: its pencil mid-squiggle says "draw", where Phosphor's pencils say "edit". */
export const DrawIcon = ({ size }: IconProps) => <IconSvg svg={draw} size={size} />;
