import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import api from "./api";

const role = "broker";
const defaultCustomerUrl = import.meta.env.PROD ? "https://omni-customer.onrender.com" : "http://localhost:5174";
const defaultWorkerUrl = import.meta.env.PROD ? "https://omni-worker.onrender.com" : "http://localhost:5176";
const customerUrl = import.meta.env.VITE_CUSTOMER_APP_URL || defaultCustomerUrl;
const workerUrl = import.meta.env.VITE_WORKER_APP_URL || defaultWorkerUrl;
const sessionKey = "omni_broker_session";
const rememberTruthyValues = new Set(["1", "true", "yes", "on"]);
const rememberFalsyValues = new Set(["0", "false", "no", "off"]);
const BrokerDashboard = lazy(() => import("./components/BrokerDashboard"));
const BrokerAuthPage = lazy(() => import("./components/BrokerAuthPage"));

function RouteLoader() {
  return <div className="flex min-h-screen items-center justify-center bg-emerald-50 text-slate-600">Loading page...</div>;
}

function toSessionPayload(session) {
  if (!session?.user) {
    return null;
  }

  return {
    user: session.user,
    token: typeof session.token === "string" ? session.token : ""
  };
}

function parseStoredSession(raw) {
  try {
    const parsed = JSON.parse(raw || "null");
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

function getSessionFromStorage(storage) {
  return parseStoredSession(storage.getItem(sessionKey));
}

function getStoredSession() {
  const sessionSession = getSessionFromStorage(window.sessionStorage);
  if (sessionSession) {
    return { ...sessionSession, rememberMe: false };
  }

  const localSession = getSessionFromStorage(window.localStorage);
  if (localSession) {
    return { ...localSession, rememberMe: true };
  }

  return null;
}

function storeSession(session, rememberMe = false) {
  const payload = toSessionPayload(session);
  if (!payload) {
    return;
  }

  const targetStorage = rememberMe ? window.localStorage : window.sessionStorage;
  const secondaryStorage = rememberMe ? window.sessionStorage : window.localStorage;
  targetStorage.setItem(sessionKey, JSON.stringify(payload));
  secondaryStorage.removeItem(sessionKey);
}

function clearSession() {
  window.localStorage.removeItem(sessionKey);
  window.sessionStorage.removeItem(sessionKey);
}

function parseRememberParam(raw) {
  if (typeof raw !== "string") {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (rememberTruthyValues.has(normalized)) {
    return true;
  }
  if (rememberFalsyValues.has(normalized)) {
    return false;
  }

  return null;
}

function cleanAuthTokenFromUrl() {
  const url = new URL(window.location.href);
  if (url.searchParams.has("authToken")) {
    url.searchParams.delete("authToken");
    url.searchParams.delete("remember");
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
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("authToken");
      if (!urlToken) {
        setChecking(false);
        return;
      }
      const rememberFromQuery = parseRememberParam(params.get("remember"));
      const shouldRemember = rememberFromQuery ?? true;

      try {
        const response = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${urlToken}` }
        });
        const user = response.data?.user;
        if (user?.role === role) {
          const nextSession = { user, token: urlToken, rememberMe: shouldRemember };
          storeSession(nextSession, shouldRemember);
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
    const payload = toSessionPayload(session);
    if (!payload) {
      clearSession();
      setAuthSession(null);
      return;
    }

    const shouldRemember = Boolean(session?.rememberMe);
    storeSession(payload, shouldRemember);
    setAuthSession({ ...payload, rememberMe: shouldRemember });
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
              authUser || path === "/" ? (
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
