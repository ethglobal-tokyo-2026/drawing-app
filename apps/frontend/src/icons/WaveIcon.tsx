import bold from "@phosphor-icons/core/bold/wave-sine-bold.svg?raw";
import fill from "@phosphor-icons/core/fill/wave-sine-fill.svg?raw";
import { IconSvg, type IconProps, type IconWeight } from "./IconSvg";

export const WaveIcon = ({ size, weight = "bold" }: IconProps & { weight?: IconWeight }) => (
  <IconSvg svg={weight === "fill" ? fill : bold} size={size} />
);
