/**
 * FloatingChatbot.jsx
 * FILE: frontend/shared/components/FloatingChatbot.jsx
 *
 * Single shared chatbot component used by ALL THREE apps:
 *   - landing-page       → role="landing"
 *   - customer-frontend  → role="customer"
 *   - worker-frontend    → role="worker"
 *   - broker-frontend    → role="broker"
 *
 * Usage in each app's dashboard:
 *   import FloatingChatbot from '@shared/components/FloatingChatbot';
 *   <FloatingChatbot role="customer" authToken={authToken} userName={userName} />
 */

import React, { useState, useCallback } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatWindow from "./ChatWindow";

// Role-specific accent colors
const ROLE_COLORS = {
  landing: {
    fab:       "from-sky-200 to-cyan-300",
    fabHover:  "hover:from-sky-300 hover:to-cyan-400",
    ring:      "focus:ring-sky-300",
    pulse:     "bg-sky-300",
    shadow:    "rgba(56,189,248,0.35)",
    iconClass: "text-sky-900",
    textClass: "text-sky-900",
    minimizedLabel: "Omni Guide"
  },
  customer: {
    fab:       "from-blue-500 to-blue-700",
    fabHover:  "hover:from-blue-600 hover:to-blue-800",
    ring:      "focus:ring-blue-300",
    pulse:     "bg-blue-500",
    shadow:    "rgba(59,130,246,0.5)",
    minimizedLabel: "Omni Assistant"
  },
  worker: {
    fab:       "from-purple-500 to-purple-700",
    fabHover:  "hover:from-purple-600 hover:to-purple-800",
    ring:      "focus:ring-purple-300",
    pulse:     "bg-purple-500",
    shadow:    "rgba(139,92,246,0.5)",
    minimizedLabel: "Omni Assistant"
  },
  broker: {
    fab:       "from-emerald-500 to-emerald-700",
    fabHover:  "hover:from-emerald-600 hover:to-emerald-800",
    ring:      "focus:ring-emerald-300",
    pulse:     "bg-emerald-500",
    shadow:    "rgba(16,185,129,0.5)",
    minimizedLabel: "Omni Assistant"
  }
};

export default function FloatingChatbot({
  role = "customer",
  chatRole,
  authToken = "",
  userName = "Guest",
  onNavigate,
  currentPath = "",
  currentSearch = ""
}) {
  const [isOpen, setIsOpen]           = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasUnread, setHasUnread]     = useState(false);

  const colors = ROLE_COLORS[role] || ROLE_COLORS.customer;
  const iconClassName = isOpen ? "text-white" : (colors.iconClass || "text-white");

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    setHasUnread(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    setIsOpen(false);
  }, []);

  const handleNewBotMessage = useCallback(() => {
    if (!isOpen) setHasUnread(true);
  }, [isOpen]);

  return (
    <>
      {/* ── Floating Controls ─────────────────────────────────────────────── */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-3 z-[9999] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">

        {/* Minimized pill — click to reopen */}
        {isMinimized && !isOpen && (
          <button
            type="button"
            onClick={handleOpen}
            className={`max-w-[calc(100vw-1.5rem)] flex items-center gap-2 rounded-full bg-gradient-to-r ${colors.fab} px-3 py-2 text-sm font-semibold ${colors.textClass || "text-white"} shadow-lg transition-all duration-200 hover:scale-105 sm:px-4`}
          >
            <MessageCircle className={`h-4 w-4 ${colors.iconClass || "text-white"}`} />
            {colors.minimizedLabel || "Omni Assistant"}
          </button>
        )}

        {/* Main FAB button */}
        <button
          type="button"
          onClick={isOpen ? handleClose : handleOpen}
          aria-label={isOpen ? "Close Omni Assistant" : "Open Omni Assistant"}
          className={`relative flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 sm:h-14 sm:w-14 ${colors.ring} ${
            isOpen
              ? "bg-gray-700 hover:bg-gray-800"
              : `bg-gradient-to-br ${colors.fab} ${colors.fabHover}`
          }`}
          style={{
            boxShadow: isOpen
              ? "0 8px 32px rgba(0,0,0,0.3)"
              : `0 8px 32px ${colors.shadow}`
          }}
        >
          {/* Animated pulse ring (only when closed) */}
          {!isOpen && (
            <span
              className={`absolute inset-0 rounded-full ${colors.pulse} opacity-25 animate-ping`}
            />
          )}

          {/* Unread dot */}
          {hasUnread && !isOpen && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
              !
            </span>
          )}

          {isOpen
            ? <X className={`h-5 w-5 sm:h-6 sm:w-6 ${iconClassName}`} />
            : <MessageCircle className={`h-6 w-6 sm:h-7 sm:w-7 ${iconClassName}`} />
          }
        </button>
      </div>

      {/* ── Chat Window ───────────────────────────────────────────────────── */}
      {isOpen && (
        <ChatWindow
          role={role}
          apiRole={chatRole}
          authToken={authToken}
          userName={userName}
          routePath={currentPath}
          routeSearch={currentSearch}
          onNavigate={onNavigate}
          onClose={handleClose}
          onMinimize={handleMinimize}
          onNewBotMessage={handleNewBotMessage}
        />
      )}
    </>
  );
}