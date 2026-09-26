import { createContext } from "react";
import type { ApiClient } from "./apiClient";

export const ApiContext = createContext<ApiClient | null>(null);
