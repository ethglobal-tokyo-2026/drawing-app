import { parseSvg } from "./parseSvg";

export type IconWeight = "bold" | "fill";

export interface IconProps {
  size?: number;
}

/** Every icon renders through here: Phosphor, plus Material Symbols' `draw`. */
export function IconSvg({ svg, size = 22 }: { svg: string; size?: number }) {
  const { viewBox, body } = parseSvg(svg);
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
