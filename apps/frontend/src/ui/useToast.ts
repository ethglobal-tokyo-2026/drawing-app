import { useContext } from "react";
import { ToastContext } from "./toastContext";

/** Shows a short message as an ink slip above the tabs. */
export function useToast(): (text: string) => void {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast needs a ToastProvider above it");
  return toast;
}
