import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const defaultConfig = {
  apps: {
    landing: "http://localhost:5173",
    customer: "http://localhost:5174",
    broker: "http://localhost:5175",
    worker: "http://localhost:5176"
  }
};

function App() {
  const [config, setConfig] = useState(defaultConfig);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${apiBase}/config`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        setConfig(data);
      } catch (_error) {
        // Keep fallback URLs.
      }
    };

    load();
  }, []);

  const routeProps = {
    apiBase,
    customerUrl: config.apps?.customer || defaultConfig.apps.customer,
    brokerUrl: config.apps?.broker || defaultConfig.apps.broker,
    workerUrl: config.apps?.worker || defaultConfig.apps.worker
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" {...routeProps} />} />
      <Route path="/signup" element={<AuthPage mode="signup" {...routeProps} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
