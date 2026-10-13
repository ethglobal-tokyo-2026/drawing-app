import { PostCorrectionError } from "./errors.ts";

export const MAX_POST_POINTS = 50000;

/** Shared check on the worker input and the result crossing back into the app. */
export function validatePostCorrectionPoints(points: unknown): asserts points is number[] {
  if (
    !Array.isArray(points) ||
    points.length < 4 ||
    points.length % 4 !== 0 ||
    points.length > MAX_POST_POINTS * 4
  )
    throw new PostCorrectionError(
      "Post correction requires a bounded complete set of rendered points.",
    );
  for (let index = 0; index < points.length; index += 4) {
    if (
      ![points[index], points[index + 1], points[index + 2], points[index + 3]].every(
        Number.isFinite,
      ) ||
      points[index + 2] < 0 ||
      points[index + 3] < 0 ||
      (index > 0 && points[index + 3] < points[index - 1])
    )
      throw new PostCorrectionError(
        "Post correction received invalid rendered position, width, or elapsed time.",
      );
  }
}
