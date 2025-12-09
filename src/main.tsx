import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ModelWeightsProvider } from "@/contexts/ModelWeightsContext";

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <ModelWeightsProvider>
      <App />
    </ModelWeightsProvider>
  </React.StrictMode>
);