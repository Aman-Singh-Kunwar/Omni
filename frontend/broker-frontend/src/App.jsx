import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import api from "./api";

const role = "broker";
const defaultCustomerUrl = import.meta.env.PROD ? "https://omni-customer.onrender.com" : "http://localhost:5174";
const defaultWorkerUrl = import.meta.env.PROD ? "https://omni-worker.onrender.com" : "http://localhost:5176";
const customerUrl = import.meta.env.VITE_CUSTOMER_APP_URL || defaultCustomerUrl;
const workerUrl = import.meta.env.VITE_WORKER_APP_URL || defaultWorkerUrl;
const sessionKey = "omni_broker_session";
const BrokerDashboard = lazy(() => import("./components/BrokerDashboard"));
const BrokerAuthPage = lazy(() => import("./components/BrokerAuthPage"));

function RouteLoader() {
  return <div className="flex min-h-screen items-center justify-center bg-emerald-50 text-slate-600">Loading page...</div>;
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
  const dashboardPaths = useMemo(() => ["/", "/workers", "/bookings", "/earnings", "/profile", "/settings"], []);

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
      navigate("/login");
    }
  };

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-emerald-50 text-slate-600">Checking login...</div>;
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
              <BrokerAuthPage mode="login" onSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            authUser ? (
              <Navigate to="/" replace />
            ) : (
              <BrokerAuthPage mode="signup" onSuccess={handleAuthSuccess} />
            )
          }
        />

        {dashboardPaths.map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <div onClickCapture={handleGuestInteraction}>
                <BrokerDashboard
                  customerUrl={customerUrl}
                  workerUrl={workerUrl}
                  userName={authUser?.name || "Guest Broker"}
                  userEmail={authUser?.email || ""}
                  authToken={authToken}
                  onLogout={handleLogout}
                />
              </div>
            }
          />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
