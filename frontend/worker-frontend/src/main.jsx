import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import AppErrorBoundary from "@shared/components/AppErrorBoundary";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AppErrorBoundary appName="Omni Worker">
        <App />
      </AppErrorBoundary>
    </HashRouter>
  </React.StrictMode>
);
