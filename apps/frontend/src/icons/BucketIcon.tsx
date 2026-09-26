import bold from "@phosphor-icons/core/bold/paint-bucket-bold.svg?raw";
import fill from "@phosphor-icons/core/fill/paint-bucket-fill.svg?raw";
import { IconSvg, type IconProps, type IconWeight } from "./IconSvg";

export const BucketIcon = ({ size, weight = "bold" }: IconProps & { weight?: IconWeight }) => (
  <IconSvg svg={weight === "fill" ? fill : bold} size={size} />
);
