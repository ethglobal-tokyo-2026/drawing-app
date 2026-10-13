/** Reported through the persistent drawing error notice; committed ink is retained. */
export class PostCorrectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostCorrectionError";
  }
}
