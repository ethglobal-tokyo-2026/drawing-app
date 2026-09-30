/**
 * A person's @handle or name as printed, keeping its own case in fine print's capitals. Pass it to
 * <Trans> as a slot: Trans would read markup in a value.
 */
export function Handle({ name }: { name: string }) {
  return <span className="handle">{name}</span>;
}
