import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import api from "./api";
import FloatingChatbot from "@shared/components/FloatingChatbot";

const role = "worker";
const defaultCustomerUrl = import.meta.env.PROD ? "https://omni-customer.onrender.com" : "http://localhost:5174";
const defaultBrokerUrl = import.meta.env.PROD ? "https://omni-broker.onrender.com" : "http://localhost:5175";
const customerUrl = import.meta.env.VITE_CUSTOMER_APP_URL || defaultCustomerUrl;
const brokerUrl = import.meta.env.VITE_BROKER_APP_URL || defaultBrokerUrl;
const sessionKey = "omni_worker_session";
const rememberTruthyValues = new Set(["1", "true", "yes", "on"]);
const rememberFalsyValues = new Set(["0", "false", "no", "off"]);
const WorkerDashboard = lazy(() => import("./components/WorkerDashboard"));
const WorkerAuthPage = lazy(() => import("./components/WorkerAuthPage"));

function LoadingScreen({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-purple-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-purple-100 border-t-purple-500" />
          <img src="/omni-logo.png" alt="Omni" className="absolute inset-0 m-auto h-9 w-9 rounded-full object-contain" />
        </div>
        <p className="text-sm font-medium text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function RouteLoader() {
  return <LoadingScreen message="Loading page..." />;
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
    if (parsed?.user && typeof parsed?.token === "string" && parsed.token.trim()) {
      return parsed;
    }
    return null;
  } catch (_error) {
    return null;
  }
}

function getBrowserStorage(type) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window[type];
  } catch (_error) {
    return null;
  }
}

function getSessionFromStorage(storage) {
  if (!storage) {
    return null;
  }
  return parseStoredSession(storage.getItem(sessionKey));
}

function getStoredSession() {
  const sessionSession = getSessionFromStorage(getBrowserStorage("sessionStorage"));
  if (sessionSession) {
    return { ...sessionSession, rememberMe: false };
  }

  const localSession = getSessionFromStorage(getBrowserStorage("localStorage"));
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

  const targetStorage = rememberMe ? getBrowserStorage("localStorage") : getBrowserStorage("sessionStorage");
  const secondaryStorage = rememberMe ? getBrowserStorage("sessionStorage") : getBrowserStorage("localStorage");

  try {
    targetStorage?.setItem(sessionKey, JSON.stringify(payload));
    secondaryStorage?.removeItem(sessionKey);
  } catch (_error) {
    // Ignore storage failures in restricted browsing contexts.
  }
}

function clearSession() {
  try {
    getBrowserStorage("localStorage")?.removeItem(sessionKey);
    getBrowserStorage("sessionStorage")?.removeItem(sessionKey);
  } catch (_error) {
    // Ignore storage failures in restricted browsing contexts.
  }
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
  const dashboardPaths = useMemo(
    () => ["/", "/job-requests", "/schedule", "/earnings", "/reviews", "/job-profile", "/profile", "/settings"],
    []
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("authToken");
      const sessionToken = String(authSession?.token || "").trim();
      const tokenToValidate = String(urlToken || sessionToken).trim();

      if (!tokenToValidate) {
        clearSession();
        setAuthSession(null);
        setChecking(false);
        return;
      }

      const rememberFromQuery = parseRememberParam(params.get("remember"));
      const shouldRemember = rememberFromQuery ?? Boolean(authSession?.rememberMe ?? true);

      try {
        const response = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${tokenToValidate}` },
          cache: false
        });
        const user = response.data?.user;
        if (user?.role === role) {
          const nextSession = { user, token: tokenToValidate, rememberMe: shouldRemember };
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
        if (urlToken) {
          cleanAuthTokenFromUrl();
        }
        setChecking(false);
      }
    };

    bootstrapAuth();
  }, [authSession?.rememberMe, authSession?.token]);

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
    return <LoadingScreen message="Checking login..." />;
  }

  return (
    <>
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
              authUser || path === "/" || path === "/job-profile" ? (
                <div onClickCapture={path === "/job-profile" ? undefined : handleGuestInteraction}>
                  <WorkerDashboard
                    customerUrl={customerUrl}
                    brokerUrl={brokerUrl}
                    userId={authUser?.id || authUser?._id || ""}
                    userName={authUser?.name || "Guest"}
                    userEmail={authUser?.email || ""}
                    userPhotoUrl={authUser?.profile?.photoUrl || ""}
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
      {authUser ? (
        <FloatingChatbot
          role="worker"
          authToken={authToken}
          userName={authUser?.name || "Worker"}
          currentPath={location.pathname}
          currentSearch={location.search}
          onNavigate={navigate}
        />
      ) : null}
    </>
  );
}

export default App;
