import liff from "@line/liff";
import { IconContext, type IconProps } from "@phosphor-icons/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/keys.css";
import { ApiRoot } from "./api/ApiRoot";
import App from "./app/App.tsx";
import { followLanguageOnPage, startInLineLanguage } from "./i18n/pageLanguage";
import { PrivySignIn } from "./identity/PrivySignIn";
import { initLine } from "./line/liff";
import { LineGate } from "./line/LineGate";
import { startPerformanceRecorderAtBoot } from "./performance/performanceRecorder";
import { installLight } from "./stickers/light";
import { installPress } from "./ui/press";
import { ToastProvider } from "./ui/ToastProvider";

// The app's own controls use bold icons; fill marks an active or primary state.
const ICON_DEFAULTS: IconProps = { weight: "bold" };

// LINE's language, unless the developer slip chose one; LIFF answers both before it has started.
startInLineLanguage(liff.getAppLanguage());
followLanguageOnPage((language) => liff.i18n.setLang(language));
// LIFF starts before the app renders, since it reads the address bar as it starts; LineGate holds the
// app until it settles.
void initLine();
// From boot while it's on, so the app's own start is in the recording. It never throws: a recorder
// that can't start must not keep the app from rendering.
startPerformanceRecorderAtBoot();
installPress();
installLight(document.documentElement);

// A deploy deletes the old build's chunks, so a page still on it reloads onto the new build before
// opening what it hadn't loaded. Once per missing chunk: one still missing after that is a broken build.
const RELOADED_FOR = "draw.reloadedFor";
window.addEventListener("vite:preloadError", (event) => {
  const missing = event.payload.message;
  if (sessionStorage.getItem(RELOADED_FOR) === missing) return;
  sessionStorage.setItem(RELOADED_FOR, missing);
  event.preventDefault();
  location.reload();
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <IconContext.Provider value={ICON_DEFAULTS}>
      <ToastProvider>
        <LineGate>
          <ApiRoot>
            <App />
            <PrivySignIn />
          </ApiRoot>
        </LineGate>
      </ToastProvider>
    </IconContext.Provider>
  </StrictMode>,
);
