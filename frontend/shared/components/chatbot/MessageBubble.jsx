import React from "react";
import { Bot, ChevronRight, ExternalLink, User, Volume2 } from "lucide-react";

function MessageBubble({ message, theme, onActionClick, onSpeak, isCurrentlySpeaking }) {
  const isUser = message.role === "user";

  const renderText = (text) =>
    text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }

      return part.split("\n").map((line, j) => (
        <React.Fragment key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </React.Fragment>
      ));
    });

  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
          isUser ? `${theme.userBubble}` : "bg-gray-200 text-gray-600"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`flex max-w-[82%] flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? `${theme.userBubble} rounded-br-sm`
              : message.isError
                ? "rounded-bl-sm border border-red-100 bg-red-50 text-red-700"
                : "rounded-bl-sm border border-gray-100 bg-white text-gray-800"
          }`}
        >
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{renderText(message.text)}</p>
        </div>

        {!isUser && !message.isError && onSpeak && (
          <button
            type="button"
            onClick={() => onSpeak(message.text, message.id)}
            title={isCurrentlySpeaking ? "Stop audio" : "Listen to reply"}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all ${
              isCurrentlySpeaking
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            <Volume2 className={`h-3.5 w-3.5 ${isCurrentlySpeaking ? "animate-pulse" : ""}`} />
            {isCurrentlySpeaking ? "Stop" : "Speak"}
          </button>
        )}

        {message.navigateTo && !isUser && (
          <button
            type="button"
            onClick={() => onActionClick({ action: "navigate", path: message.navigateTo })}
            className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${theme.chipBorder}`}
          >
            <ExternalLink className="h-3 w-3" /> Open Page <ChevronRight className="h-3 w-3" />
          </button>
        )}

        {message.suggestedActions && !isUser && (
          <div className="flex flex-wrap gap-1.5">
            {message.suggestedActions.map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onActionClick(action)}
                className={`rounded-full border bg-white px-3 py-1 text-[11px] font-semibold shadow-sm transition-all ${theme.chipBorder}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <span className="px-1 text-[10px] text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

export default MessageBubble;
