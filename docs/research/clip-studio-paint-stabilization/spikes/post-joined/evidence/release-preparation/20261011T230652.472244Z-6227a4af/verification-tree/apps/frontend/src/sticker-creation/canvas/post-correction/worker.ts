import { correctPostStroke } from "./core.ts";
import type { PostWorkerRequest, PostWorkerResponse } from "./protocol.ts";

self.onmessage = ({ data }: MessageEvent<PostWorkerRequest>) => {
  const { id, input } = data;
  try {
    const result = correctPostStroke(input, (progress) =>
      self.postMessage({ id, type: "progress", progress } satisfies PostWorkerResponse),
    );
    self.postMessage({ id, type: "complete", points: result.points } satisfies PostWorkerResponse);
  } catch (error) {
    self.postMessage({
      id,
      type: "failure",
      message: error instanceof Error ? error.message : String(error),
    } satisfies PostWorkerResponse);
  }
};
