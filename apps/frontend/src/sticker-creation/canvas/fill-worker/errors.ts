import type { LayerId } from "../ops";

export interface FillFailureContext {
  layer: LayerId;
  x: number;
  y: number;
  completedRegions: number;
  pendingGestures: number;
}

export class FillError extends Error {
  readonly context: FillFailureContext | undefined;

  constructor(message: string, context?: FillFailureContext, options?: ErrorOptions) {
    super(message, options);
    this.name = "FillError";
    this.context = context;
  }
}
