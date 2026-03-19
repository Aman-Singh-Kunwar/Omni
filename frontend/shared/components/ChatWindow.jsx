/**
 * ChatWindow.jsx
 * FILE: frontend/shared/components/ChatWindow.jsx
 *
 * Role-aware chat window. Works for landing, customer, worker, and broker.
 * Navigation is handled via callback passed from each app shell.
 * API calls go to /api/chatbot with role passed in body.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Minus, RotateCcw, Send, Bot } from "lucide-react";
import VoiceInput from "./VoiceInput";
import MessageBubble from "./chatbot/MessageBubble";
import {
  ROLE_THEME,
  WELCOME_MESSAGES,
  buildPostNavigationAdvice
} from "./chatbot/chatConfig";
import {
  buildSessionKey,
  loadSessionState,
  saveSessionState,
  clearSessionState,
  persistPendingBookingAutomationAction,
  clearPendingBookingAutomationAction,
  persistChatbotPendingAction,
  clearChatbotPendingAction,
  triggerHapticFeedback
} from "./chatbot/sessionStorage";
import { resolveSpeechLanguageFromSelection, sanitizeSpeechText } from "./chatbot/speech";

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ChatWindow({
  role = "customer",
  apiRole,
  authToken = "",
  userName = "Guest",
  routePath = "",
  routeSearch = "",
  onNavigate,
  onClose,
  onMinimize,
  onNewBotMessage
}) {
  const theme = ROLE_THEME[role] || ROLE_THEME.customer;
  const welcome = WELCOME_MESSAGES[role] || WELCOME_MESSAGES.customer;
  const backendRole = ["landing", "customer", "worker", "broker"].includes(apiRole)
    ? apiRole
    : ["landing", "customer", "worker", "broker"].includes(role)
      ? role
      : "customer";
  const isLightLandingTheme = role === "landing";

  const makeWelcome = () => ({
    id: "welcome",
    role: "bot",
    text: welcome.text,
    timestamp: new Date().toISOString(),
    suggestedActions: welcome.actions
  });

  const sessionKeyRef = useRef(buildSessionKey(role, userName));
  const initialSessionRef = useRef(null);
  if (initialSessionRef.current === null) {
    initialSessionRef.current = loadSessionState(sessionKeyRef.current);
  }
  const initialSession = initialSessionRef.current;

  const [messages, setMessages]       = useState(() => {
    if (initialSession?.messages?.length) return initialSession.messages;
    return [makeWelcome()];
  });
  const [inputText, setInputText]     = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isVoiceOn, setIsVoiceOn]     = useState(false);
  const [language, setLanguage]       = useState(() => initialSession?.language || "auto"); // "auto" | "en-IN" | "hi-IN"
  const [currentSpeakingId, setCurrentSpeakingId] = useState(null);
  const languageRef                   = useRef("auto");
  const messagesEndRef                = useRef(null);
  const inputRef                      = useRef(null);
  const historyRef                    = useRef(initialSession?.history || []);
  const headerTouchRef                = useRef({ startY: 0, startX: 0, active: false });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // Keep latest language available to async callbacks and stop active speech on change.
  useEffect(() => {
    languageRef.current = language;
    window.speechSynthesis?.cancel();
    setCurrentSpeakingId(null);
    setIsSpeaking(false);
  }, [language]);

  // Ensure speech always stops when chat window unmounts (close, route change, app switch).
  useEffect(() => () => {
    window.speechSynthesis?.cancel();
  }, []);

  // Persist chat state so close/minimize/remount doesn't wipe history.
  useEffect(() => {
    const recentMessages = messages.slice(-50);
    const recentHistory = historyRef.current.slice(-20);
    saveSessionState(sessionKeyRef.current, {
      messages: recentMessages,
      history: recentHistory,
      language
    });
  }, [messages, language]);

  function speakGuidanceForPath(path) {
    if (!window.speechSynthesis) return;
    const guidance = buildPostNavigationAdvice(path, languageRef.current);
    if (!guidance) return;

    const clean = sanitizeSpeechText(guidance, 540);

    if (!clean) return;

    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = resolveSpeechLanguageFromSelection(clean, languageRef.current);
    utt.rate = 0.86;
    utt.pitch = 1.0;
    utt.volume = 0.9;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }

  const performNavigate = useCallback((path) => {
    if (!path) return;
    if (typeof onNavigate === "function") {
      onNavigate(path);
      return;
    }
    if (typeof window !== "undefined") {
      window.location.assign(path);
    }
  }, [onNavigate]);

  const isSameTargetAsCurrentRoute = useCallback((targetPath) => {
    const rawTarget = String(targetPath || "").trim();
    const currentPath = String(routePath || "").trim();
    const currentSearch = String(routeSearch || "").trim();
    if (!rawTarget || !currentPath) return false;

    try {
      const targetUrl = new URL(rawTarget, "https://omni.local");
      const normalizedCurrentSearch =
        currentSearch && currentSearch !== "?"
          ? (currentSearch.startsWith("?") ? currentSearch : `?${currentSearch}`)
          : "";
      return (
        targetUrl.pathname === currentPath &&
        (targetUrl.search || "") === normalizedCurrentSearch
      );
    } catch {
      return false;
    }
  }, [routePath, routeSearch]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || isLoading) return;
    const userText = text.trim();
    setInputText("");
    triggerHapticFeedback(8);

    // Append user bubble
    setMessages((prev) => [...prev, {
      id: `u-${Date.now()}`,
      role: "user",
      text: userText,
      timestamp: new Date().toISOString()
    }]);

    historyRef.current = [
      ...historyRef.current.slice(-8),
      { role: "user", text: userText }
    ];

    setIsLoading(true);

    try {
      const requestPayload = {
        message: userText,
        role: backendRole,
        language: languageRef.current,
        routePath,
        routeSearch,
        conversationHistory: historyRef.current.slice(-6)
      };

      const requestOnce = async () => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 18000);
        try {
          const response = await fetch(`${API_BASE}/chatbot`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify(requestPayload),
            signal: controller.signal
          });
          const json = await response.json().catch(() => ({}));
          return { response, json };
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      let result;
      try {
        result = await requestOnce();
      } catch (error) {
        const shouldRetry =
          error?.name === "AbortError" || /network|failed to fetch/i.test(String(error?.message || ""));
        if (!shouldRetry) throw error;
        result = await requestOnce();
      }

      const res = result.response;
      const data = result.json;
      if (!res.ok) throw new Error(data.message || "API error");

      historyRef.current = [...historyRef.current, { role: "bot", text: data.reply }];

      const botMsg = {
        id:               `b-${Date.now()}`,
        role:             "bot",
        text:             data.reply,
        timestamp:        data.timestamp || new Date().toISOString(),
        navigateTo:       data.navigateTo || null,
        suggestedActions: data.suggestedActions || null,
        type:             data.type
      };

      setMessages((prev) => [...prev, botMsg]);
      onNewBotMessage?.();
      speakText(data.reply, botMsg.id, languageRef.current);

      const automationAction =
        data?.action && typeof data.action === "object" && typeof data.action.type === "string"
          ? data.action
          : null;

      const shouldPersistGenericAction = new Set([
        "customer_bookings_action",
        "worker_job_action",
        "worker_schedule_action"
      ]).has(automationAction?.type);
      if (shouldPersistGenericAction) {
        persistChatbotPendingAction(automationAction);
      }

      const shouldPersistBookingAction =
        automationAction?.type === "customer_booking_flow" && automationAction?.payload?.flowStep === "booking_form";
      if (shouldPersistBookingAction) {
        persistPendingBookingAutomationAction(automationAction);
      } else {
        clearPendingBookingAutomationAction();
      }

      if (!shouldPersistGenericAction) {
        clearChatbotPendingAction();
      }

      // Auto-navigate for direct navigation commands
      if (automationAction?.payload?.navigateTo && !isSameTargetAsCurrentRoute(automationAction.payload.navigateTo)) {
        setTimeout(() => {
          performNavigate(automationAction.payload.navigateTo);
          onMinimize?.();
          setTimeout(() => {
            speakGuidanceForPath(automationAction.payload.navigateTo);
          }, 220);
        }, 700);
      } else if (data.type === "navigation" && data.navigateTo && !isSameTargetAsCurrentRoute(data.navigateTo)) {
        setTimeout(() => {
          performNavigate(data.navigateTo);
          onMinimize?.();
          setTimeout(() => {
            speakGuidanceForPath(data.navigateTo);
          }, 220);
        }, 700);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id:        `err-${Date.now()}`,
        role:      "bot",
        text:      "Sorry, I'm having trouble connecting right now. Please try again. 🔄",
        timestamp: new Date().toISOString(),
        isError:   true
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    authToken,
    backendRole,
    routePath,
    routeSearch,
    performNavigate,
    isSameTargetAsCurrentRoute,
    onMinimize,
    onNewBotMessage
  ]);

  // ── Action chips ───────────────────────────────────────────────────────────
  const handleAction = useCallback((action) => {
    triggerHapticFeedback(8);
    if (action.action === "navigate") {
      performNavigate(action.path);
      onMinimize?.();
      setTimeout(() => {
        speakGuidanceForPath(action.path);
      }, 220);
    } else if (action.action === "message") {
      sendMessage(action.text);
    }
  }, [performNavigate, onMinimize, sendMessage]);

  // ── Text-to-speech ─────────────────────────────────────────────────────────
  const speakText = useCallback((text, msgId = null, selectedLanguage = null) => {
    if (!window.speechSynthesis || !text) return;

    const speechEngine = window.speechSynthesis;
    const isSameMessagePlaying =
      Boolean(msgId) &&
      currentSpeakingId === msgId &&
      (isSpeaking || speechEngine.speaking);

    // Toggle behavior: clicking active message speaker again should stop playback.
    if (isSameMessagePlaying) {
      speechEngine.cancel();
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
      return;
    }

    speechEngine.cancel();
    setCurrentSpeakingId(msgId);
    triggerHapticFeedback(8);

    const clean = sanitizeSpeechText(text, 500);

    if (!clean) return;

    const utt = new SpeechSynthesisUtterance(clean);

    // Determine language
    let lang = selectedLanguage || languageRef.current;
    if (lang === "auto") {
      lang = /[\u0900-\u097F]/.test(text) ? "hi-IN" : "en-IN";
    }
    
    utt.lang = lang;
    utt.rate = 0.85;
    utt.pitch = 1.0;
    utt.volume = 0.9;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => { setIsSpeaking(false); setCurrentSpeakingId(null); };
    utt.onerror = () => { setIsSpeaking(false); setCurrentSpeakingId(null); };
    speechEngine.speak(utt);
  }, [currentSpeakingId, isSpeaking]);

  const handleReset = useCallback(() => {
    setMessages([makeWelcome()]);
    historyRef.current = [];
    window.speechSynthesis?.cancel();
    clearSessionState(sessionKeyRef.current);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(inputText); }
  }, [sendMessage, inputText]);

  const handleHeaderTouchStart = useCallback((event) => {
    const touch = event.touches?.[0];
    if (!touch) {
      headerTouchRef.current = { startY: 0, startX: 0, active: false };
      return;
    }

    headerTouchRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      active: true
    };
  }, []);

  const handleHeaderTouchEnd = useCallback((event) => {
    const state = headerTouchRef.current;
    if (!state.active) return;

    const touch = event.changedTouches?.[0];
    headerTouchRef.current = { startY: 0, startX: 0, active: false };
    if (!touch) return;

    const deltaY = touch.clientY - state.startY;
    const deltaX = Math.abs(touch.clientX - state.startX);
    if (deltaY > 72 && deltaX < 60) {
      triggerHapticFeedback(12);
      onMinimize?.();
    }
  }, [onMinimize]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed left-2 right-2 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-[9998] flex max-h-[calc(100dvh-0.75rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl h-[min(78dvh,640px)] sm:left-auto sm:right-6 sm:bottom-24 sm:w-[clamp(320px,90vw,400px)] sm:h-[clamp(480px,80vh,600px)]"
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between bg-gradient-to-r ${theme.headerGradient} px-4 py-3`}
        onTouchStart={handleHeaderTouchStart}
        onTouchEnd={handleHeaderTouchEnd}
      >
        <div className="flex items-center gap-3">
          <div className={`relative flex h-9 w-9 items-center justify-center rounded-full ${isLightLandingTheme ? "bg-white/80" : "bg-white/20"}`}>
            <Bot className={`h-5 w-5 ${isLightLandingTheme ? "text-sky-700" : "text-white"}`} />
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${theme.headerDot} bg-green-400`} />
          </div>
          <div>
            <p className={`text-sm font-bold leading-tight ${isLightLandingTheme ? "text-sky-900" : "text-white"}`}>{theme.label}</p>
            <p className={`text-[11px] leading-tight ${isLightLandingTheme ? "text-sky-700" : "text-white/75"}`}>
              {isSpeaking ? "🔊 Speaking..." : "Online • Ready to help"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            title="Select language"
            className={`rounded-lg text-xs px-2 py-1.5 border focus:outline-none focus:ring-2 transition-colors cursor-pointer ${isLightLandingTheme ? "bg-white/90 text-sky-900 border-sky-200 hover:bg-white focus:ring-sky-300" : "bg-white/20 text-white border-white/30 hover:bg-white/30 focus:ring-white/50"}`}
          >
            <option value="auto" className={isLightLandingTheme ? "bg-white text-slate-900" : "bg-gray-800"}>🌐 Auto</option>
            <option value="en-IN" className={isLightLandingTheme ? "bg-white text-slate-900" : "bg-gray-800"}>🇬🇧 English</option>
            <option value="hi-IN" className={isLightLandingTheme ? "bg-white text-slate-900" : "bg-gray-800"}>🇮🇳 हिंदी</option>
          </select>
          
          <button type="button" onClick={handleReset} title="Reset"
            className={`rounded-lg p-1.5 transition-colors ${isLightLandingTheme ? "text-sky-700 hover:bg-white/70 hover:text-sky-900" : "text-white/70 hover:bg-white/20 hover:text-white"}`}>
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={onMinimize} title="Minimize"
            className={`rounded-lg p-1.5 transition-colors ${isLightLandingTheme ? "text-sky-700 hover:bg-white/70 hover:text-sky-900" : "text-white/70 hover:bg-white/20 hover:text-white"}`}>
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain bg-gray-50 p-3 space-y-3">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            theme={theme}
            onActionClick={handleAction}
            onSpeak={speakText}
            isCurrentlySpeaking={currentSpeakingId === msg.id}
          />
        ))}

        {/* Typing dots */}
        {isLoading && (
          <div className="flex items-end gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200">
              <Bot className="h-4 w-4 text-gray-500" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white p-3">
        <div className="flex items-end gap-2">
          <VoiceInput
            isActive={isVoiceOn}
            recognitionLanguage={language}
            onStart={() => setIsVoiceOn(true)}
            onResult={(t) => { setIsVoiceOn(false); if (t) sendMessage(t); }}
            onStop={() => setIsVoiceOn(false)}
          />
          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or speak..."
            disabled={isLoading}
            className={`flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${theme.inputFocus} leading-relaxed`}
            style={{ maxHeight: "5rem" }}
          />
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(8);
              sendMessage(inputText);
            }}
            disabled={!inputText.trim() || isLoading}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${theme.sendBtn}`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-400">
          Language: {language === "auto" ? "Auto-detect" : language === "en-IN" ? "English 🇬🇧" : "हिंदी 🇮🇳"} • Enter to send
        </p>
      </div>
    </div>
  );
}