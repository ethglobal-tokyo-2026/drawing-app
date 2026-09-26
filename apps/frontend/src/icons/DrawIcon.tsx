import { PencilSimpleLine } from "@phosphor-icons/react";

interface Props {
  size?: number;
  weight?: "bold" | "fill";
}

/** Every Draw action's icon: Phosphor's pencil drawing a line. The app has no edit action for it to be confused with. */
export function DrawIcon({ size = 20, weight = "fill" }: Props) {
  return <PencilSimpleLine size={size} weight={weight} aria-hidden focusable="false" />;
}
