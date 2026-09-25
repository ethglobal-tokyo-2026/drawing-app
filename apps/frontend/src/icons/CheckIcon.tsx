import fill from "@phosphor-icons/core/fill/check-fat-fill.svg?raw";
import { IconSvg, type IconProps } from "./IconSvg";

/** The seal check; always the fill weight, since it only appears on the seal key. */
export const CheckIcon = ({ size }: IconProps) => <IconSvg svg={fill} size={size} />;
