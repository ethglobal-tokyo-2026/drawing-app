// Types CSS custom properties (`--*`) so `style` objects can set them without a cast.
import "react";

declare module "react" {
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined;
  }
}
