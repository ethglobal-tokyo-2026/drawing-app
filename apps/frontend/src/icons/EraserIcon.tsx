import bold from "@phosphor-icons/core/bold/eraser-bold.svg?raw";
import fill from "@phosphor-icons/core/fill/eraser-fill.svg?raw";
import { IconSvg, type IconProps, type IconWeight } from "./IconSvg";

export const EraserIcon = ({ size, weight = "bold" }: IconProps & { weight?: IconWeight }) => (
  <IconSvg svg={weight === "fill" ? fill : bold} size={size} />
);
