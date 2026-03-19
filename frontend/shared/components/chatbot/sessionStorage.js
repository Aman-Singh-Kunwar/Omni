import { CHATBOT_BOOKING_ACTION_KEY, CHATBOT_PENDING_ACTION_KEY, CHAT_SESSION_PREFIX } from "./chatConfig";

function buildSessionKey(role, userName) {
  const safeRole = String(role || "customer").toLowerCase();
  const safeUser = String(userName || "guest").trim().toLowerCase().replace(/\s+/g, "-");
  return `${CHAT_SESSION_PREFIX}:${safeRole}:${safeUser}`;
}

function loadSessionState(sessionKey) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      language: ["auto", "en-IN", "hi-IN"].includes(parsed.language) ? parsed.language : "auto"
    };
  } catch {
    return null;
  }
}

function saveSessionState(sessionKey, payload) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(sessionKey, JSON.stringify(payload));
  } catch {
    // Ignore storage quota/privacy mode errors.
  }
}

function clearSessionState(sessionKey) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(sessionKey);
  } catch {
    // Ignore storage quota/privacy mode errors.
  }
}

function persistPendingBookingAutomationAction(action) {
  if (typeof window === "undefined" || !action) return;
  try {
    window.sessionStorage.setItem(CHATBOT_BOOKING_ACTION_KEY, JSON.stringify(action));
  } catch {
    // Ignore storage quota/privacy mode errors.
  }
}

function clearPendingBookingAutomationAction() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHATBOT_BOOKING_ACTION_KEY);
  } catch {
    // Ignore storage quota/privacy mode errors.
  }
}

function persistChatbotPendingAction(action) {
  if (typeof window === "undefined" || !action || typeof action !== "object") return;
  try {
    window.sessionStorage.setItem(CHATBOT_PENDING_ACTION_KEY, JSON.stringify(action));
  } catch {
    // Ignore storage quota/privacy mode errors.
  }
}

function readChatbotPendingAction() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CHATBOT_PENDING_ACTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearChatbotPendingAction() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHATBOT_PENDING_ACTION_KEY);
  } catch {
    // Ignore storage quota/privacy mode errors.
  }
}

function triggerHapticFeedback(pattern = 10) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore unsupported haptics errors.
  }
}

export {
  buildSessionKey,
  loadSessionState,
  saveSessionState,
  clearSessionState,
  persistPendingBookingAutomationAction,
  clearPendingBookingAutomationAction,
  persistChatbotPendingAction,
  readChatbotPendingAction,
  clearChatbotPendingAction,
  triggerHapticFeedback
};
