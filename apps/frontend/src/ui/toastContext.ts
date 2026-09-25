import { createContext } from "react";

export const ToastContext = createContext<((text: string) => void) | null>(null);
