import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useApi } from "../api/useApi";
import { useMe } from "../api/meContext";
import { BoardPlacementSaves, type BoardPlacementState } from "./boardPlacementSaves";

const Context = createContext<BoardPlacementSaves | null>(null);

/** Survives tab mounts, but leaves with the account and its immutable API client. */
export function BoardPlacementSavesProvider({ children }: { children: ReactNode }): ReactNode {
  const api = useApi();
  const { id } = useMe();
  const saves = useMemo(() => new BoardPlacementSaves(api, id), [api, id]);
  useEffect(() => saves.activate(), [saves]);
  return <Context value={saves}>{children}</Context>;
}

// This hook and its provider share the account-scoped context.
// oxlint-disable-next-line react/only-export-components
export function useBoardPlacementSaves(): {
  saves: BoardPlacementSaves;
  state: BoardPlacementState;
} {
  const saves = useContext(Context);
  if (!saves) throw new Error("The sticker board requires BoardPlacementSavesProvider");
  const state = useSyncExternalStore(saves.subscribe, saves.read);
  return { saves, state };
}
