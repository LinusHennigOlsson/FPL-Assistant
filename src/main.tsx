import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ModelWeightsProvider } from "@/contexts/ModelWeightsContext";

import { normalizeBasePath } from "./fixBasePath";

// 🔧 Fix GitHub Pages subfolder routing
normalizeBasePath();

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <ModelWeightsProvider>
      <App />
    </ModelWeightsProvider>
  </React.StrictMode>
);
