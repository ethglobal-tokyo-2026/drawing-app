import liff from "@line/liff";
import { IconContext, type IconProps } from "@phosphor-icons/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/keys.css";
import "./styles/text-field.css";
import { ApiRoot } from "./api/ApiRoot";
import { openSessionEarly } from "./api/serverClients";
import App from "./app/App.tsx";
import { AppCrashBoundary } from "./app/AppCrashBoundary";
import { followLanguageOnPage, startInLineLanguage } from "./i18n/pageLanguage";
import { PrivySignIn } from "./identity/PrivySignIn";
import { ChatMenuLink } from "./line/chatMenu";
import { initLine } from "./line/liff";
import { LineGate } from "./line/LineGate";
import { startPerformanceRecorderAtBoot } from "./performance/performanceRecorder";
import { installLight } from "./stickers/light";
import { installPress } from "./ui/press";
import { reloadOntoNewBuild } from "./ui/reloadOntoNewBuild";
import { ToastProvider } from "./ui/ToastProvider";

// The app's own controls use bold icons; fill marks an active or primary state.
const ICON_DEFAULTS: IconProps = { weight: "bold" };

// LINE's language, unless the person chose one; LIFF answers both before it has started.
startInLineLanguage(liff.getAppLanguage());
followLanguageOnPage((language) => liff.i18n.setLang(language));
// LIFF starts before the app renders, since it reads the address bar as it starts; LineGate holds the
// app until it settles.
void initLine();
// Meanwhile the server says who the session cookie signs in, and sends the first screen's data.
openSessionEarly();
// From boot while it's on, so the app's own start is in the recording. It never throws: a recorder
// that can't start must not keep the app from rendering.
startPerformanceRecorderAtBoot();
installPress();
installLight(document.documentElement);

// This module's URL names the build: its chunk's hash changes with every chunk it loads.
window.addEventListener("vite:preloadError", (event) => reloadOntoNewBuild(event, import.meta.url));

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <IconContext.Provider value={ICON_DEFAULTS}>
      <ToastProvider>
        <AppCrashBoundary>
          <LineGate>
            <ApiRoot>
              <App />
              <ChatMenuLink />
              <PrivySignIn />
            </ApiRoot>
          </LineGate>
        </AppCrashBoundary>
      </ToastProvider>
    </IconContext.Provider>
  </StrictMode>,
);
