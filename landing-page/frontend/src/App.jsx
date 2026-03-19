import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import FloatingChatbot from "@shared/components/FloatingChatbot";
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
  const navigate = useNavigate();
  const location = useLocation();
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

  const handleChatbotNavigate = useCallback((path) => {
    const normalizedPath = String(path || "").trim();
    if (!normalizedPath) return;

    if (
      normalizedPath === "/" ||
      normalizedPath.startsWith("/?") ||
      normalizedPath.startsWith("/login") ||
      normalizedPath.startsWith("/signup")
    ) {
      navigate(normalizedPath);
      return;
    }

    const customerApp = String(routeProps.customerUrl || defaultConfig.apps.customer).replace(/\/+$/, "");
    const hashPath = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
    window.location.assign(`${customerApp}/#${hashPath}`);
  }, [navigate, routeProps.customerUrl]);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" {...routeProps} />} />
        <Route path="/signup" element={<AuthPage mode="signup" {...routeProps} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FloatingChatbot
        role="landing"
        chatRole="landing"
        userName="Visitor"
        currentPath={location.pathname}
        currentSearch={location.search}
        onNavigate={handleChatbotNavigate}
      />
    </>
  );
}

export default App;
