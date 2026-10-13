import type { PostCorrectionInput, PostCorrectionProgress } from "./core.ts";

export interface PostWorkerRequest {
  id: number;
  input: PostCorrectionInput;
}
export type PostWorkerResponse =
  | { id: number; type: "complete"; points: number[] }
  | { id: number; type: "progress"; progress: PostCorrectionProgress }
  | { id: number; type: "failure"; message: string };
