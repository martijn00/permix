import { PermixProvider } from "permix/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { permix } from "./lib/permix";

createRoot(document.querySelector("#root")!).render(
  <StrictMode>
    <PermixProvider permix={permix}>
      <App />
    </PermixProvider>
  </StrictMode>
);
