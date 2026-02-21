import { io } from "socket.io-client";

const defaultApiBase = import.meta.env.PROD ? "https://omni-backend-4t7s.onrender.com/api" : "http://localhost:5000/api";

function normalizeBaseUrl(value, fallback = "") {
  const normalized = String(value || fallback || "").trim().replace(/\/+$/, "");
  return normalized || String(fallback || "").trim();
}

function resolveSocketBaseUrl() {
  const explicitSocketUrl = normalizeBaseUrl(import.meta.env.VITE_SOCKET_URL);
  if (explicitSocketUrl) {
    return explicitSocketUrl;
  }

  const apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL, defaultApiBase);
  return apiBaseUrl.replace(/\/api$/i, "");
}

function createRealtimeSocket(authToken, options = {}) {
  const token = String(authToken || "").trim();
  if (!token) {
    return null;
  }

  return io(resolveSocketBaseUrl(), {
    transports: ["websocket", "polling"],
    timeout: 15000,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: { token },
    ...options
  });
}

export { createRealtimeSocket, resolveSocketBaseUrl };
