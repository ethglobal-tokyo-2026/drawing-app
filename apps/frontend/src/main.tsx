import { IconContext, type IconProps } from "@phosphor-icons/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/keys.css";
import App from "./app/App.tsx";
import { PrivySignIn } from "./identity/PrivySignIn";
import { initLine } from "./line/liff";
import { LineGate } from "./line/LineGate";
import { installPress } from "./ui/press";
import { ToastProvider } from "./ui/ToastProvider";

// The app's own controls use bold icons; fill marks an active or primary state.
const ICON_DEFAULTS: IconProps = { weight: "bold" };

// LIFF starts first, since it reads the address bar as it starts; LineGate holds the app until it settles.
void initLine();
installPress();

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <IconContext.Provider value={ICON_DEFAULTS}>
      <ToastProvider>
        <LineGate>
          <App />
          <PrivySignIn />
        </LineGate>
      </ToastProvider>
    </IconContext.Provider>
  </StrictMode>,
);
