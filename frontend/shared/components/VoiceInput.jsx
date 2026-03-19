/**
 * VoiceInput.jsx
 * FILE: frontend/shared/components/VoiceInput.jsx
 *
 * Microphone button using Web Speech API.
 * Shared across customer, worker, broker apps.
 * Supports Hindi + English recognition.
 */

import React, { useRef, useCallback, useState, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

function resolveRecognitionLanguage(selectedLanguage) {
  if (selectedLanguage === "hi-IN") return "hi-IN";
  if (selectedLanguage === "en-IN") return "en-IN";

  // Auto: choose based on browser locale, fallback to English.
  const browserLang = (typeof navigator !== "undefined" && navigator.language) || "en-IN";
  return browserLang.toLowerCase().startsWith("hi") ? "hi-IN" : "en-IN";
}

export default function VoiceInput({
  isActive,
  onStart,
  onResult,
  onStop,
  recognitionLanguage = "auto"
}) {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError]             = useState("");
  const supported = Boolean(SpeechRecognition);

  useEffect(() => () => {
    try { recognitionRef.current?.stop(); } catch (_) {}
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;
    setError("");

    const rec = new SpeechRecognition();
    rec.lang = resolveRecognitionLanguage(recognitionLanguage);
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart  = () => { setIsListening(true); onStart?.(); };
    rec.onresult = (e)  => { setIsListening(false); onResult?.(e.results[0]?.[0]?.transcript || ""); };
    rec.onerror  = (e)  => {
      setIsListening(false);
      setError(e.error === "no-speech" ? "No speech" : "Mic error");
      onStop?.();
      setTimeout(() => setError(""), 2000);
    };
    rec.onend = () => { setIsListening(false); };

    recognitionRef.current = rec;
    try { rec.start(); } catch { setError("Mic unavailable"); }
  }, [onStart, onResult, onStop, recognitionLanguage]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch (_) {}
    setIsListening(false);
    onStop?.();
  }, [onStop]);

  if (!supported) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        aria-label={isListening ? "Stop recording" : "Voice input"}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ${
          isListening
            ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100 animate-pulse"
            : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
        }`}
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>

      {isListening && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-red-600 px-2 py-1 text-[10px] font-semibold text-white shadow-lg pointer-events-none">
          🎙️ Listening...
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-red-600" />
        </div>
      )}
      {error && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-800 px-2 py-1 text-[10px] text-white shadow-lg pointer-events-none">
          {error}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-800" />
        </div>
      )}
    </div>
  );
}