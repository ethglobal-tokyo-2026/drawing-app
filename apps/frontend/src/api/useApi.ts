import { useContext } from "react";
import type { ApiClient } from "./apiClient";
import { ApiContext } from "./apiContext";

/** The REST API's client for this app. */
export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (!client) throw new Error("useApi needs an ApiProvider above it");
  return client;
}
