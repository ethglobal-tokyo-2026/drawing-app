import type { ReactNode } from "react";
import type { ApiClient } from "./apiClient";
import { ApiContext } from "./apiContext";

export function ApiProvider({ client, children }: { client: ApiClient; children: ReactNode }) {
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}
