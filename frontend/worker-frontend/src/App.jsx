import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import api from "./api";

const role = "worker";
const defaultCustomerUrl = import.meta.env.PROD ? "https://omni-customer.onrender.com" : "http://localhost:5174";
const defaultBrokerUrl = import.meta.env.PROD ? "https://omni-broker.onrender.com" : "http://localhost:5175";
const customerUrl = import.meta.env.VITE_CUSTOMER_APP_URL || defaultCustomerUrl;
const brokerUrl = import.meta.env.VITE_BROKER_APP_URL || defaultBrokerUrl;
const sessionKey = "omni_worker_session";
const WorkerDashboard = lazy(() => import("./components/WorkerDashboard"));
const WorkerAuthPage = lazy(() => import("./components/WorkerAuthPage"));

function RouteLoader() {
  return <div className="flex min-h-screen items-center justify-center bg-purple-50 text-slate-600">Loading page...</div>;
}

function getStoredSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(sessionKey) || "null");
    if (parsed?.user) {
      return parsed;
    }
    if (parsed?.id) {
      return { user: parsed, token: "" };
    }
    return null;
  } catch (_error) {
    return null;
  }
}

function storeSession(session) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(sessionKey);
}

function cleanAuthTokenFromUrl() {
  const url = new URL(window.location.href);
  if (url.searchParams.has("authToken")) {
    url.searchParams.delete("authToken");
    const suffix = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${suffix ? `?${suffix}` : ""}`);
  }
}

function App() {
  const [authSession, setAuthSession] = useState(() => getStoredSession());
  const [checking, setChecking] = useState(true);
  const authUser = authSession?.user || null;
  const authToken = authSession?.token || "";
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardPaths = useMemo(() => ["/", "/job-requests", "/schedule", "/earnings", "/reviews", "/profile", "/settings"], []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("authToken");
      if (!urlToken) {
        setChecking(false);
        return;
      }

      try {
        const response = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${urlToken}` }
        });
        const user = response.data?.user;
        if (user?.role === role) {
          const nextSession = { user, token: urlToken };
          storeSession(nextSession);
          setAuthSession(nextSession);
        } else {
          clearSession();
          setAuthSession(null);
        }
      } catch (_error) {
        clearSession();
        setAuthSession(null);
      } finally {
        cleanAuthTokenFromUrl();
        setChecking(false);
      }
    };

    bootstrapAuth();
  }, []);

  const handleGuestInteraction = (event) => {
    if (authUser) {
      return;
    }

    const allowGuestNavigation = event.target.closest("[data-public-navigation='true']");
    if (allowGuestNavigation) {
      return;
    }

    const interactive = event.target.closest("button,input,select,textarea,a,.cursor-pointer,[role='button']");
    if (!interactive) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
  };

  const handleAuthSuccess = (session) => {
    storeSession(session);
    setAuthSession(session);
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await api.post(
          "/auth/logout",
          {},
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
      }
    } catch (_error) {
      // Ignore logout API errors and continue client-side logout.
    } finally {
      clearSession();
      setAuthSession(null);
      navigate("/", { replace: true });
    }
  };

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-purple-50 text-slate-600">Checking login...</div>;
  }

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route
          path="/login"
          element={
            authUser ? (
              <Navigate to="/" replace />
            ) : (
              <WorkerAuthPage mode="login" onSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            authUser ? (
              <Navigate to="/" replace />
            ) : (
              <WorkerAuthPage mode="signup" onSuccess={handleAuthSuccess} />
            )
          }
        />

        {dashboardPaths.map((path) => (
          <Route
            key={path}
            path={path}
            element={
              authUser || path === "/" ? (
                <div onClickCapture={handleGuestInteraction}>
                  <WorkerDashboard
                    customerUrl={customerUrl}
                    brokerUrl={brokerUrl}
                    userName={authUser?.name || "Guest"}
                    userEmail={authUser?.email || ""}
                    authToken={authToken}
                    onLogout={handleLogout}
                  />
                </div>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
