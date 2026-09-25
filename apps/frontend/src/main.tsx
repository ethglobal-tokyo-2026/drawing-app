import { IconContext, type IconProps } from "@phosphor-icons/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/keys.css";
import App from "./app/App.tsx";
import { initLine } from "./line/liff";
import { installPress } from "./ui/press";
import { ToastProvider } from "./ui/ToastProvider";

// The app's own controls use bold icons; fill marks an active or primary state.
const ICON_DEFAULTS: IconProps = { weight: "bold" };

// Start LIFF right away; the app renders meanwhile and picks up the
// LINE identity when it arrives.
void initLine();
installPress();

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <IconContext.Provider value={ICON_DEFAULTS}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </IconContext.Provider>
  </StrictMode>,
);
