import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AuthPage from "./components/AuthPage";
import LandingPage from "./components/LandingPage";

const defaultApiBase = import.meta.env.PROD ? "https://omni-backend-4t7s.onrender.com/api" : "http://localhost:5000/api";
const apiBase = import.meta.env.VITE_API_URL || defaultApiBase;

const defaultConfig = {
  apps: {
    landing: import.meta.env.PROD ? "https://omni-landing-page.onrender.com" : "http://localhost:5173",
    customer: import.meta.env.PROD ? "https://omni-customer.onrender.com" : "http://localhost:5174",
    broker: import.meta.env.PROD ? "https://omni-broker.onrender.com" : "http://localhost:5175",
    worker: import.meta.env.PROD ? "https://omni-worker.onrender.com" : "http://localhost:5176"
  }
};

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  return null;
}

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
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" {...routeProps} />} />
        <Route path="/signup" element={<AuthPage mode="signup" {...routeProps} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
