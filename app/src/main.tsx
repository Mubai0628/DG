import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppShell } from "./shell/AppShell.js";
import "./shell/theme.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AppShell />
  </StrictMode>
);
