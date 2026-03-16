import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";

import App from "./App";
import "./index.css";

if (typeof globalThis.Buffer === "undefined") {
  (globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
