// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { emptyApi, renderWithApi, TEST_ME } from "../../api/testing";
import { useSettingSaves, waitUntilSettingsSaved, pauseSettingsWrites } from "./settingSaves";

let leave = () => {};
afterEach(() => {
  leave();
  vi.restoreAllMocks();
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

it("pauses new settings changes without blocking settings already queued", async () => {
  const server = deferred<typeof TEST_ME>();
  const send = vi.fn(() => server.promise);
  const api = emptyApi();
  function Note() {
    const { save, statuses } = useSettingSaves();
    return (
      <>
        <button onClick={() => save("language", { language: "ja" }, send, () => null)}>
          Language
        </button>
        <button
          data-failed={statuses.nsfw?.step}
          onClick={() => save("nsfw", { nsfwOptIn: true }, send, () => null)}
        >
          NSFW
        </button>
      </>
    );
  }
  const view = renderWithApi(<Note />, api);
  leave = view.unmount;
  await act(async () => view.host.querySelector("button")?.click());
  const resume = pauseSettingsWrites(api);
  act(() => view.host.querySelectorAll("button")[1]?.click());
  expect(send).toHaveBeenCalledOnce();
  await act(async () => server.resolve(TEST_ME));
  expect(view.host.querySelectorAll("button")[1]?.dataset.failed).toBe("failed");
  resume();
  await act(async () => view.host.querySelectorAll("button")[1]?.click());
  expect(send).toHaveBeenCalledTimes(2);
});

it("waits for queued settings and the device application of their answers", async () => {
  const server = deferred<typeof TEST_ME>();
  const device = deferred<null>();
  const api = emptyApi();
  function Note() {
    const { save } = useSettingSaves();
    return (
      <button
        onClick={() => {
          save(
            "nsfw",
            { nsfwOptIn: true },
            () => server.promise,
            () => device.promise,
          );
          save(
            "kyotoSeika",
            { kyotoSeikaPractice: true },
            () => Promise.resolve(TEST_ME),
            () => null,
          );
        }}
      >
        Save
      </button>
    );
  }
  const view = renderWithApi(<Note />, api);
  leave = view.unmount;
  act(() => view.host.querySelector("button")?.click());
  let settled = false;
  const waiting = waitUntilSettingsSaved(api, new AbortController().signal).then(() => {
    settled = true;
  });
  await act(async () => server.resolve(TEST_ME));
  expect(settled).toBe(false);
  await act(async () => device.resolve(null));
  await waiting;
  expect(settled).toBe(true);
});

it("retains the failed setting and names it when settlement fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const api = emptyApi();
  function Note() {
    const { save, statuses } = useSettingSaves();
    return (
      <button
        data-failed={statuses.nsfw?.step}
        onClick={() =>
          save(
            "nsfw",
            { nsfwOptIn: true },
            async () => {
              throw new Error("offline");
            },
            () => null,
          )
        }
      >
        Save
      </button>
    );
  }
  const view = renderWithApi(<Note />, api);
  leave = view.unmount;
  await act(async () => view.host.querySelector("button")?.click());
  await expect(waitUntilSettingsSaved(api, new AbortController().signal)).rejects.toMatchObject({
    code: "person_switch_settings_unsaved",
    detail: "nsfw",
  });
  expect(view.host.querySelector("button")?.dataset.failed).toBe("failed");
});

it("stops waiting for settings after the settlement deadline", async () => {
  const api = emptyApi();
  function Note() {
    const { save } = useSettingSaves();
    return (
      <button
        onClick={() =>
          save(
            "language",
            { language: "ja" },
            () => new Promise(() => {}),
            () => null,
          )
        }
      >
        Save
      </button>
    );
  }
  const view = renderWithApi(<Note />, api);
  leave = view.unmount;
  act(() => view.host.querySelector("button")?.click());
  const deadline = new AbortController();
  const waiting = waitUntilSettingsSaved(api, deadline.signal);
  deadline.abort();
  await expect(waiting).rejects.toMatchObject({ code: "timeout" });
});
