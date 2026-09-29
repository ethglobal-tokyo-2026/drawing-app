import { expect } from "vitest";
import type { z } from "zod";
import { errorBodySchema } from "../errors.ts";

/** The status and ErrorBody a request was refused with. */
export const refusalOf = async (response: Response) => ({
  status: response.status,
  ...errorBodySchema.parse(await response.json()),
});

/** The body a request answered with `status`, parsed by `schema`; another status fails, showing the body. */
export async function bodyOf<Schema extends z.ZodType>(
  response: Response,
  schema: Schema,
  status = 200,
) {
  const body: unknown = await response.json();
  expect(response.status, JSON.stringify(body)).toBe(status);
  return schema.parse(body);
}
