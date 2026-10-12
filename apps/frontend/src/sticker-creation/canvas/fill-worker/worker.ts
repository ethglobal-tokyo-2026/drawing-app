import { prepareFillPatch } from "./core";
import { fillTransferBuffers, type FillWorkerRequest, type FillWorkerResponse } from "./protocol";

// The frontend compiles against DOM types; only these worker methods are used here.
declare const self: {
  onmessage: ((event: MessageEvent<FillWorkerRequest>) => void) | null;
  postMessage: (response: FillWorkerResponse, transfer: Transferable[]) => void;
};

self.onmessage = ({ data: { id, input } }) => {
  try {
    const result = prepareFillPatch(input);
    const arrays =
      result.kind === "found"
        ? [
            result.pixels.data,
            result.found.marks,
            result.interiorSpans,
            ...(result.written ? [result.written.spans, result.written.colors] : []),
          ]
        : [];
    self.postMessage({ id, type: "complete", result }, fillTransferBuffers(arrays));
  } catch (error) {
    self.postMessage(
      { id, type: "failure", message: error instanceof Error ? error.message : String(error) },
      [],
    );
  }
};
