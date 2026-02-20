import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const defaultApiBase = import.meta.env.PROD ? "https://omni-backend-4t7s.onrender.com/api" : "http://localhost:5000/api";
const apiBase = import.meta.env.VITE_API_URL || defaultApiBase;
const LandingPage = lazy(() => import("./components/LandingPage"));
const AuthPage = lazy(() => import("./components/AuthPage"));

const defaultConfig = {
  apps: {
    landing: import.meta.env.PROD ? "https://omni-landing-page.onrender.com" : "http://localhost:5173",
    customer: import.meta.env.PROD ? "https://omni-customer.onrender.com" : "http://localhost:5174",
    broker: import.meta.env.PROD ? "https://omni-broker.onrender.com" : "http://localhost:5175",
    worker: import.meta.env.PROD ? "https://omni-worker.onrender.com" : "http://localhost:5176"
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading page...</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" {...routeProps} />} />
        <Route path="/signup" element={<AuthPage mode="signup" {...routeProps} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
