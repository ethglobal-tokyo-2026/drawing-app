import type { Me } from "@drawing-app/api/client";
import { useSyncExternalStore } from "react";
import { ApiError, apiError, type ApiClient } from "../../api/apiClient";
import { useSetMe } from "../../api/meContext";
import { useApi } from "../../api/useApi";

/** The Settings note's settings that save to your account. */
export type Setting = "language" | "nsfw" | "kyotoSeika";
/** The account's settings as the note shows them: a saving one shows its new value. */
export type Shown = Pick<Me, "language" | "nsfwOptIn" | "kyotoSeikaPractice">;
/** Why a setting didn't take: kept as it failed, so its words follow the app's language. */
export type Failure = { kind: "notSaved" | "notKept"; error: unknown };
/**
 * A setting's last change while it saves, waiting its turn included, or why it didn't take, until it's
 * changed again. A setting that took has none: its control shows it.
 */
type Status = { step: "saving"; to: Partial<Shown> } | { step: "failed"; failure: Failure };

/** The settings' saves through one client, and each setting's status. */
class SettingSaves {
  private statuses: Partial<Record<Setting, Status>> = {};
  /** The saves, each run once the ones changed before it have. */
  private queue = Promise.resolve();
  /** Each setting's latest change: only its outcome is that setting's status. */
  private latest = new Map<Setting, object>();
  private listeners = new Set<() => void>();
  private writePauses = 0;

  subscribe = (onChange: () => void) => {
    this.listeners.add(onChange);
    return () => void this.listeners.delete(onChange);
  };

  read = () => this.statuses;

  pauseNewWrites(): () => void {
    this.writePauses += 1;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.writePauses -= 1;
      }
    };
  }

  waitUntilSaved(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      let unsubscribe = () => {};
      const finish = (error?: ApiError) => {
        unsubscribe();
        signal.removeEventListener("abort", aborted);
        if (error) reject(error);
        else resolve();
      };
      const aborted = () =>
        finish(
          new ApiError(0, {
            error: "timeout",
            detail: "Settings did not finish saving before switching.",
          }),
        );
      const check = () => {
        if (signal.aborted) {
          aborted();
          return;
        }
        const statuses = Object.entries(this.statuses);
        if (statuses.some(([, status]) => status?.step === "saving")) return;
        const affected = statuses
          .filter(([, status]) => status?.step === "failed")
          .map(([setting]) => setting);
        finish(
          affected.length
            ? new ApiError(409, {
                error: "person_switch_settings_unsaved",
                detail: affected.join(", "),
              })
            : undefined,
        );
      };
      unsubscribe = this.subscribe(check);
      signal.addEventListener("abort", aborted, { once: true });
      check();
    });
  }

  save(
    setMe: (me: Me) => void,
    setting: Setting,
    to: Partial<Shown>,
    request: () => Promise<Me>,
    apply: () => Promise<Failure | null> | Failure | null,
  ) {
    if (this.statuses[setting]?.step === "saving") return;
    if (this.writePauses) {
      this.statuses = {
        ...this.statuses,
        [setting]: {
          step: "failed",
          failure: {
            kind: "notSaved",
            error: new ApiError(409, { error: "session_account_changed" }),
          },
        },
      };
      this.listeners.forEach((listener) => listener());
      return;
    }
    const change = {};
    this.latest.set(setting, change);
    const settle = (status: Status | undefined) => {
      if (this.latest.get(setting) !== change) return;
      this.statuses = { ...this.statuses, [setting]: status };
      this.listeners.forEach((listener) => listener());
    };
    settle({ step: "saving", to });
    this.queue = this.queue.then(async () => {
      let saved: Me;
      try {
        saved = await request();
      } catch (error) {
        const failure = apiError(error);
        console.error(`The ${setting} setting wasn't saved`, failure);
        settle({ step: "failed", failure: { kind: "notSaved", error: failure } });
        return;
      }
      setMe(saved);
      const failure = await apply();
      settle(failure ? { step: "failed", failure } : undefined);
    });
  }
}

/**
 * The saves made through each client. They outlive the note, which unmounts with the board on another
 * tab, so the note you come back to shows a save still on its way, or why it failed.
 */
const savesByClient = new WeakMap<ApiClient, SettingSaves>();

function savesThrough(api: ApiClient): SettingSaves {
  let saves = savesByClient.get(api);
  if (!saves) {
    saves = new SettingSaves();
    savesByClient.set(api, saves);
  }
  return saves;
}

/** Account switching drains queued settings and their device application, without discarding failures. */
export function waitUntilSettingsSaved(api: ApiClient, signal: AbortSignal): Promise<void> {
  return savesThrough(api).waitUntilSaved(signal);
}

/** Blocks new note changes without interfering with settings already waiting their turn. */
export function pauseSettingsWrites(api: ApiClient): () => void {
  return savesThrough(api).pauseNewWrites();
}

/**
 * Your settings' statuses, and `save`, which saves a setting after the changes before it, so each
 * answer is the account as it then is, then applies it: `me` takes the answer, and `apply` does what it
 * changes on this phone, returning what it couldn't do rather than throwing. A setting still saving
 * takes no other change: its control shows the one on its way.
 */
export function useSettingSaves() {
  const saves = savesThrough(useApi());
  const setMe = useSetMe();
  const statuses = useSyncExternalStore(saves.subscribe, saves.read);
  const save = (
    setting: Setting,
    to: Partial<Shown>,
    request: () => Promise<Me>,
    apply: () => Promise<Failure | null> | Failure | null,
  ) => saves.save(setMe, setting, to, request, apply);
  return { statuses, save };
}
