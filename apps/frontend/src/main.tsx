import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/base.css";
import App from "./app/App.tsx";
import { initLine } from "./line/liff";

// Start LIFF right away; the app renders meanwhile and picks up the
// LINE identity when it arrives.
void initLine();

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
