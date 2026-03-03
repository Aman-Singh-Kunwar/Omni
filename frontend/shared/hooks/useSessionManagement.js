import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Shared session management hook for all role-based apps
 * Handles authentication state, storage, and navigation
 */

const rememberTruthyValues = new Set(["1", "true", "yes", "on"]);
const rememberFalsyValues = new Set(["0", "false", "no", "off"]);

function toSessionPayload(session) {
  if (!session?.user) return null;
  return {
    user: session.user,
    token: typeof session.token === "string" ? session.token : ""
  };
}

function parseStoredSession(raw) {
  try {
    const parsed = JSON.parse(raw || "null");
    if (parsed?.user) return parsed;
    if (parsed?.id) return { user: parsed, token: "" };
    return null;
  } catch (_error) {
    return null;
  }
}

function getBrowserStorage(type) {
  if (typeof window === "undefined") return null;
  try {
    return window[type];
  } catch (_error) {
    return null;
  }
}

function getSessionFromStorage(storage, sessionKey) {
  if (!storage) return null;
  const raw = storage.getItem(sessionKey);
  const session = parseStoredSession(raw);
  
  if (!session && raw) {
    try {
      storage.removeItem(sessionKey);
    } catch (_error) {
    }
  }
  return session;
}

export function useSessionManagement(config = {}) {
  const {
    defaultPath = "/auth",
    dashboardPath = "/dashboard",
    sessionKey = "omni_session",
    validateToken = () => true // Custom validation function
  } = config;

  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const sessionSession = getSessionFromStorage(
      getBrowserStorage("sessionStorage"),
      sessionKey
    );
    if (sessionSession) {
      setSession(sessionSession);
      setRememberMe(false);
      setIsInitialized(true);
      return;
    }

    const localSession = getSessionFromStorage(
      getBrowserStorage("localStorage"),
      sessionKey
    );
    if (localSession) {
      setSession(localSession);
      setRememberMe(true);
      setIsInitialized(true);
      return;
    }

    setIsInitialized(true);
  }, [sessionKey]);

  useEffect(() => {
    if (!session || !validateToken(session.token)) {
      handleLogout();
    }
  }, [session]);

  const handleLogin = (newSession, shouldRemember = false) => {
    const payload = toSessionPayload(newSession);
    if (!payload) return false;

    setSession(payload);
    setRememberMe(shouldRemember);

    const storage = shouldRemember ? getBrowserStorage("localStorage") : getBrowserStorage("sessionStorage");
    if (storage) {
      try {
        storage.setItem(sessionKey, JSON.stringify(payload));
      } catch (_error) {
        console.error("Failed to save session to storage");
      }
    }

    return true;
  };

  const handleLogout = () => {
    setSession(null);
    setRememberMe(false);

    [getBrowserStorage("localStorage"), getBrowserStorage("sessionStorage")].forEach((storage) => {
      if (storage) {
        try {
          storage.removeItem(sessionKey);
        } catch (_error) {
        }
      }
    });

    navigate(defaultPath);
  };

  const rememberMeChecked = rememberMe
    ? "1"
    : rememberTruthyValues.has(localStorage?.getItem(sessionKey + "_remember") || "")
    ? "1"
    : "0";

  const handleRememberMeChange = (value) => {
    const checked = rememberTruthyValues.has(String(value || ""));
    setRememberMe(checked);
    const storage = getBrowserStorage("localStorage");
    if (storage) {
      try {
        storage.setItem(sessionKey + "_remember", checked ? "1" : "0");
      } catch (_error) {
      }
    }
  };

  return useMemo(
    () => ({
      session,
      isAuthenticated: !!session,
      isInitialized,
      rememberMe,
      rememberMeChecked,
      handleLogin,
      handleLogout,
      handleRememberMeChange,
      user: session?.user || null,
      token: session?.token || null
    }),
    [session, rememberMe, isInitialized]
  );
}

export default useSessionManagement;
