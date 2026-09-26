import bold from "@phosphor-icons/core/bold/paint-brush-bold.svg?raw";
import fill from "@phosphor-icons/core/fill/paint-brush-fill.svg?raw";
import { IconSvg, type IconProps, type IconWeight } from "./IconSvg";

export const BrushIcon = ({ size, weight = "bold" }: IconProps & { weight?: IconWeight }) => (
  <IconSvg svg={weight === "fill" ? fill : bold} size={size} />
);
