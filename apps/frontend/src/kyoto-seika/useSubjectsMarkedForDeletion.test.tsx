// @vitest-environment happy-dom
import { act, useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { SessionEnvelopeContext } from "../api/sessionContext";
import { sessionEnvelope } from "../api/sessionTestFixtures";
import { emptyApi, renderWithApi, TEST_ME } from "../api/testing";
import { useSubjectsMarkedForDeletion, type SubjectMarks } from "./useSubjectsMarkedForDeletion";

const probe: { marks: SubjectMarks | null } = { marks: null };
function Probe() {
  const marks = useSubjectsMarkedForDeletion();
  useLayoutEffect(() => {
    probe.marks = marks;
  });
  return null;
}

const settle = () => act(() => Promise.resolve());
let unmount = () => {};
afterEach(() => unmount());
vi.spyOn(console, "error").mockImplementation(() => {});

/** The hook under `client`, as the operator acting as themself when `operator`. */
async function render(client: Partial<ApiClient>, operator: boolean) {
  const envelope = sessionEnvelope(TEST_ME, { marksKyotoSeikaSubjects: operator });
  ({ unmount } = renderWithApi(
    <SessionEnvelopeContext value={envelope}>
      <Probe />
    </SessionEnvelopeContext>,
    emptyApi(client),
  ));
  await settle();
}

const marks = () => {
  if (!probe.marks) throw new Error("The hook gave no marks");
  return probe.marks;
};

describe("useSubjectsMarkedForDeletion", () => {
  it("asks nothing and gives nothing for anyone but the operator", async () => {
    const load = vi.fn(() => Promise.resolve(["風"]));
    await render({ subjectsMarkedForDeletion: load }, false);
    expect(load).not.toHaveBeenCalled();
    expect(probe.marks).toBeNull();
  });

  it("marks at once, puts the word back when the server refuses, and tries again", async () => {
    const refusal = new ApiError(0, { error: "network", detail: "PUT got no answer" });
    const mark = vi.fn().mockRejectedValueOnce(refusal).mockResolvedValue(undefined);
    await render(
      { subjectsMarkedForDeletion: () => Promise.resolve(["風"]), markSubjectForDeletion: mark },
      true,
    );
    expect([...marks().marked]).toEqual(["風"]);

    act(() => marks().toggle("春"));
    expect(marks().marked.has("春")).toBe(true);
    await settle();
    expect(mark).toHaveBeenCalledWith("春");
    expect([...marks().marked]).toEqual(["風"]);
    expect(marks().failure).toMatchObject({ kind: "mark", word: "春", error: refusal });

    act(() => marks().failure?.retry());
    await settle();
    expect(mark).toHaveBeenCalledTimes(2);
    expect(marks().marked.has("春")).toBe(true);
    expect(marks().failure).toBeNull();
  });
});
