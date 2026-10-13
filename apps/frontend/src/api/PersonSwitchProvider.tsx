import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { problemOf } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { lineUserId } from "../line/liff";
import { useBoardPlacementSaves } from "../sticker-board/BoardPlacementSavesProvider";
import {
  pauseSettingsWrites,
  waitUntilSettingsSaved,
} from "../sticker-board/stat-board/settingSaves";
import { ErrorLine } from "../ui/ErrorLine";
import { ApiError, apiError } from "./apiClient";
import {
  requestPersonSwitch,
  receivePersonSwitchNotice,
  type PersonSwitchNotice,
} from "./personSwitch";
import {
  currentSelection,
  requestSessionRestore,
  suspendSession,
  useSessionEnvelope,
} from "./sessionContext";
import {
  beforeAccountRelease,
  reportSessionLost,
  requestAccountRelease,
  retryAccountRelease,
} from "./sessionLoss";
import { serverSession } from "./serverClients";
import { useApi } from "./useApi";

type Request = (targetUserId: string) => Promise<void>;
type SwitchContext = {
  pending: boolean;
  error: ApiError | null;
  request: Request;
  block: (item: string) => () => void;
};
const Context = createContext<SwitchContext | null>(null);
const NOTICE_KEY = "croquis.person-switch.notice";
const CHANNEL = "croquis.person-switch";
const unavailable: Request = async () => {
  throw new ApiError(403, { error: "person_switch_forbidden" });
};

/** Account-scoped transition state. Its immutable client continues draining saves while signing stops. */
export function PersonSwitchProvider({ children }: { children: ReactNode }) {
  const session = useSessionEnvelope();
  const api = useApi();
  const { saves } = useBoardPlacementSaves();
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const active = useRef(false);
  const blockers = useRef(new Map<object, string>());
  const channel = useRef<BroadcastChannel | null>(null);
  const resumeWrites = useRef<(() => void) | null>(null);
  const pause = useCallback(() => {
    if (!resumeWrites.current) {
      const board = saves.pauseNewWrites();
      const settings = pauseSettingsWrites(api);
      resumeWrites.current = () => {
        board();
        settings();
      };
    }
    setFrozen(true);
    suspendSession();
  }, [api, saves]);

  useLayoutEffect(
    () =>
      beforeAccountRelease({
        userId: session.me.id,
        preservationError: () => saves.read().preservationError,
        retryPreservation: () => saves.retryPreservation(),
        blocked: (preservation) => {
          pause();
          setPending(false);
          setError(preservation);
        },
      }),
    [pause, saves, session.me.id],
  );

  useEffect(() => {
    if (session.personSwitchMode === "off") return;
    const receive = (notice: unknown) =>
      receivePersonSwitchNotice(notice, session, pause, reportSessionLost);
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel.current = new BroadcastChannel(CHANNEL);
        channel.current.onmessage = (event) => receive(event.data);
      } catch (failure) {
        // The storage event below is the supported fallback when a browser cannot open the channel.
        console.error(
          "Person switching notifications will use device storage because the tab channel could not open",
          failure,
        );
      }
    }
    const stored = (event: StorageEvent) => {
      if (event.key !== NOTICE_KEY || !event.newValue) return;
      try {
        receive(JSON.parse(event.newValue));
      } catch (failure) {
        console.error("The other tab's person selection notification could not be read", failure);
        setError(apiError(failure));
      }
    };
    window.addEventListener("storage", stored);
    return () => {
      channel.current?.close();
      channel.current = null;
      window.removeEventListener("storage", stored);
    };
  }, [pause, saves, session]);

  const block = useCallback((item: string) => {
    const operation = {};
    blockers.current.set(operation, item);
    return () => {
      blockers.current.delete(operation);
    };
  }, []);
  const request = useCallback<Request>(
    async (targetUserId) => {
      if (active.current || frozen) return;
      active.current = true;
      setPending(true);
      setError(null);
      try {
        await requestPersonSwitch(targetUserId, {
          session,
          api: serverSession,
          principal: lineUserId,
          settle: (signal) =>
            Promise.all([saves.waitUntilSaved(signal), waitUntilSettingsSaved(api, signal)]).then(
              () => {},
            ),
          blockers: () => [...blockers.current.values()],
          suspend: pause,
          restore: (restored) => {
            requestSessionRestore(restored);
            resumeWrites.current?.();
            resumeWrites.current = null;
            setFrozen(false);
          },
          navigate: (path) => {
            requestAccountRelease(session.me.id, () => location.assign(path));
          },
          notice: (notice: PersonSwitchNotice) => {
            if (channel.current) channel.current.postMessage(notice);
            else
              localStorage.setItem(
                NOTICE_KEY,
                JSON.stringify({ ...notice, nonce: crypto.randomUUID() }),
              );
          },
        });
      } catch (failure) {
        const preservation = saves.read().preservationError;
        const problem = preservation ?? apiError(failure);
        console.error("Switching the selected person failed", problem);
        setError(problem);
        if (preservation) pause();
        else setFrozen(currentSelection() === null);
        setPending(false);
      } finally {
        active.current = false;
      }
    },
    [api, frozen, pause, saves, session],
  );
  const value = useMemo(
    () => ({ pending, error, request, block }),
    [pending, error, request, block],
  );
  const problem = error ? problemOf(error) : null;
  return (
    <Context value={value}>
      <div style={{ display: "contents" }} inert={frozen || pending}>
        {children}
      </div>
      {pending && !error && <p role="status">{t(($) => $.personSwitch.pending)}</p>}
      {problem && (
        <ErrorLine
          detail={problem.detail}
          action={
            frozen && error?.code === "person_switch_placement_preservation_failed"
              ? {
                  label: t(($) => $.ui.errorLine.tryAgain),
                  onClick: () => retryAccountRelease(session.me.id, () => location.reload()),
                }
              : frozen
                ? {
                    label: t(($) => $.personSwitch.reload),
                    onClick: () => {
                      requestAccountRelease(session.me.id, () => location.reload());
                    },
                  }
                : undefined
          }
        >
          {t(($) => $.personSwitch.failed, { reason: problem.message })}
        </ErrorLine>
      )}
    </Context>
  );
}

// Hooks share the provider's account-scoped context.
// oxlint-disable-next-line react/only-export-components
export function usePersonSwitch(): { pending: boolean; error: ApiError | null; request: Request } {
  return useContext(Context) ?? { pending: false, error: null, request: unavailable };
}

// oxlint-disable-next-line react/only-export-components
export function usePersonSwitchBlocker(active: boolean, affectedItem: string): void {
  const context = useContext(Context);
  const block = context?.block;
  useLayoutEffect(
    () => (active && block ? block(affectedItem) : undefined),
    [active, affectedItem, block],
  );
}
