import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import CustomerDashboard from "./components/CustomerDashboard";
import CustomerAuthPage from "./components/CustomerAuthPage";
import api from "./api";

const role = "customer";
const brokerUrl = import.meta.env.VITE_BROKER_APP_URL || "http://localhost:5175";
const workerUrl = import.meta.env.VITE_WORKER_APP_URL || "http://localhost:5176";
const sessionKey = "omni_customer_session";

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
  const dashboardPaths = useMemo(() => ["/", "/bookings/new", "/bookings", "/favorites", "/profile", "/settings"], []);

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

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">Checking login...</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          authUser ? (
            <Navigate to="/" replace />
          ) : (
            <CustomerAuthPage mode="login" onSuccess={handleAuthSuccess} />
          )
        }
      />
      <Route
        path="/signup"
        element={
          authUser ? (
            <Navigate to="/" replace />
          ) : (
            <CustomerAuthPage mode="signup" onSuccess={handleAuthSuccess} />
          )
        }
      />

      {dashboardPaths.map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <div onClickCapture={handleGuestInteraction}>
              <CustomerDashboard
                brokerUrl={brokerUrl}
                workerUrl={workerUrl}
                userName={authUser?.name || "Guest Customer"}
                userEmail={authUser?.email || ""}
                authToken={authToken}
                onLogout={() => {
                  clearSession();
                  setAuthSession(null);
                  navigate("/login");
                }}
              />
            </div>
          }
        />
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
