import bold from "@phosphor-icons/core/bold/eyes-bold.svg?raw";
import fill from "@phosphor-icons/core/fill/eyes-fill.svg?raw";
import { IconSvg, type IconProps, type IconWeight } from "./IconSvg";

export const EyesIcon = ({ size, weight = "bold" }: IconProps & { weight?: IconWeight }) => (
  <IconSvg svg={weight === "fill" ? fill : bold} size={size} />
);
