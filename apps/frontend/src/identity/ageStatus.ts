/** A person's Age status from World ID: unknown until they verify. */
export const AGE_STATUSES = ["adult", "minor", "unknown"] as const;
export type AgeStatus = (typeof AGE_STATUSES)[number];

export const isAgeStatus = (value: unknown): value is AgeStatus =>
  AGE_STATUSES.some((status) => status === value);

// Stand-in for World ID until the API sends each person's age status: the demo's people by handle,
// everyone else adult, so `?as=alice` and `?as=bob` windows agree without setup.
const DEMO_AGE_STATUS: Readonly<Record<string, AgeStatus>> = { bob: "minor" };

export function ageStatusOf(person: { handle: string | null }): AgeStatus {
  return (person.handle && DEMO_AGE_STATUS[person.handle.toLowerCase()]) || "adult";
}
