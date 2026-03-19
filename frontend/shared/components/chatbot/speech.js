function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(String(text || ""));
}

function resolveSpeechLanguageFromSelection(text, selectedLanguage) {
  if (selectedLanguage === "hi-IN") return "hi-IN";
  if (selectedLanguage === "en-IN") return "en-IN";
  return hasDevanagari(text) ? "hi-IN" : "en-IN";
}

function sanitizeSpeechText(text, maxLength = 500) {
  return String(text || "")
    .replace(/[^\w\s\u0900-\u097F.,!?()-]/g, " ")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/[\n-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export { hasDevanagari, resolveSpeechLanguageFromSelection, sanitizeSpeechText };
