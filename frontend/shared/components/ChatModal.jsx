import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCheck, MessageCircle, Pencil, Send, Trash2, X, ArrowDown } from "lucide-react";
import { createRealtimeSocket, resolveSocketBaseUrl } from "@shared/utils/realtime";

const LOCKED_STATUSES = new Set(["completed", "cancelled", "not-provided"]);

function formatMsgTime(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

function TickIcon({ status }) {
  if (status === "sending") return <Check className="w-3 h-3 text-white/50 shrink-0" />;
  if (status === "sent")    return <CheckCheck className="w-3 h-3 text-white/60 shrink-0" />;
  if (status === "read")    return <CheckCheck className="w-3 h-3 text-blue-300 shrink-0" />;
  if (status === "failed")  return <X className="w-3 h-3 text-red-300 shrink-0" />;
  return null;
}

function ChatModal({
  open, onClose, bookingId,
  senderName, senderRole,
  counterpartName = "Other",
  authToken = "",
  bookingStatus = "",
  automationAction = null,
  onAutomationHandled
}) {
  const [messages,     setMessages]     = useState([]);
  const [inputText,    setInputText]    = useState("");
  const [sending,      setSending]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [connected,    setConnected]    = useState(false);
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editingMsg,   setEditingMsg]   = useState(null);
  const [mounted,      setMounted]      = useState(false);
  const [animating,    setAnimating]    = useState(false);
  const [otherOnline,  setOtherOnline]  = useState(false);
  const [automationNotice, setAutomationNotice] = useState("");
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showJumpButton, setShowJumpButton] = useState(false);

  const socketRef      = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const seenIds        = useRef(new Set());
  const pendingIds     = useRef(new Set());
  const otherIsReading = useRef(false);
  const historyLoaded  = useRef(false);
  const inputRef       = useRef(null);
  const longPressTimer = useRef(null);
  const typingTimer    = useRef(null);
  const dblClickTimer  = useRef(null);
  const hasRespondedPresence = useRef(false);
  const processedAutomationIdsRef = useRef(new Set());

  const isLocked = LOCKED_STATUSES.has(bookingStatus);

  const scrollToBottom = useCallback(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);
  
  const handleMarkAllAsRead = useCallback(() => {
    if (socketRef.current && bookingId) {
      socketRef.current.emit("chat:read", { bookingId });
      setMessages(prev => 
        prev.map(m => m.senderRole !== senderRole ? { ...m, status: "read" } : m)
      );
    }
  }, [bookingId, senderRole]);
  
  // Detect if user scrolled away from bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowJumpButton(!isAtBottom);
      if (isAtBottom) setAutoScroll(true);
    };
    
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);


  const loadHistory = useCallback(async (socket) => {
    if (!bookingId || !authToken) return;
    setLoading(true);
    setError("");
    try {
      const base = resolveSocketBaseUrl() + "/api";
      const res = await fetch(`${base}/bookings/${bookingId}/chat`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      msgs.forEach((m) => { if (m.messageId) seenIds.current.add(m.messageId); });
      setMessages(msgs.map((m) => ({ ...m, status: "sent" })));
      socket?.emit("chat:read", { bookingId });
    } catch {
      setError("Could not load chat history.");
    } finally {
      setLoading(false);
    }
  }, [bookingId, authToken]);


  useEffect(() => {
    if (!open || !bookingId || !authToken) return undefined;

    seenIds.current        = new Set();
    pendingIds.current     = new Set();
    otherIsReading.current = false;
    historyLoaded.current  = false;
    hasRespondedPresence.current = false;
    setMessages([]);
    setInputText("");
    setError("");
    setConnected(false);
    setOtherOnline(false);
    setSelectedIds(new Set());
    setIsSelectMode(false);
    setEditingMsg(null);
    setAutomationNotice("");

    const socket = createRealtimeSocket(authToken);
    if (!socket) return undefined;
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit("join:booking", bookingId);
      socket.emit("chat:presence", { bookingId, online: true });
      if (!historyLoaded.current) {
        historyLoaded.current = true;
        loadHistory(socket);
      }
    };
    const onDisconnect = () => setConnected(false);

    const onMessage = (data) => {
      if (!data || data.bookingId !== bookingId) return;
      if (pendingIds.current.has(data.messageId)) {
        pendingIds.current.delete(data.messageId);
        const nextStatus = otherIsReading.current ? "read" : "sent";
        setMessages((prev) =>
          prev.map((m) => m.messageId === data.messageId ? { ...m, status: nextStatus } : m)
        );
        return;
      }
      if (seenIds.current.has(data.messageId)) return;
      seenIds.current.add(data.messageId);
      setMessages((prev) => [...prev, { ...data, status: "sent" }]);
      if (data.senderRole !== senderRole) socket.emit("chat:read", { bookingId });
    };

    const onChatRead = (data) => {
      if (!data || data.bookingId !== bookingId) return;
      if (data.readerRole === senderRole) return;
      otherIsReading.current = true;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderRole === senderRole && m.status === "sent" ? { ...m, status: "read" } : m
        )
      );
    };

    const onChatDeleted = (data) => {
      if (!data || data.bookingId !== bookingId) return;
      const del = new Set(data.messageIds);
      setMessages((prev) => prev.filter((m) => !del.has(m.messageId)));
      data.messageIds.forEach((id) => seenIds.current.delete(id));
    };

    const onChatEdited = (data) => {
      if (!data || data.bookingId !== bookingId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === data.messageId ? { ...m, text: data.text, edited: true } : m
        )
      );
    };

    const onChatPresence = (data) => {
      if (!data || data.bookingId !== bookingId) return;
      if (data.senderRole === senderRole) return;
      setOtherOnline(data.online);
      if (data.online && !hasRespondedPresence.current) {
        hasRespondedPresence.current = true;
        socket.emit("chat:presence", { bookingId, online: true });
      }
    };
    
    const onChatTyping = (data) => {
      if (!data || data.bookingId !== bookingId) return;
      if (data.senderRole === senderRole) return;
      setOtherIsTyping(data.typing);
    };

    socket.on("connect",        onConnect);
    socket.on("disconnect",     onDisconnect);
    socket.on("chat:message",   onMessage);
    socket.on("chat:read",      onChatRead);
    socket.on("chat:deleted",   onChatDeleted);
    socket.on("chat:edited",    onChatEdited);
    socket.on("chat:presence",  onChatPresence);
    socket.on("chat:typing",    onChatTyping);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect",        onConnect);
      socket.off("disconnect",     onDisconnect);
      socket.off("chat:message",   onMessage);
      socket.off("chat:read",      onChatRead);
      socket.off("chat:deleted",   onChatDeleted);
      socket.off("chat:edited",    onChatEdited);
      socket.off("chat:presence",  onChatPresence);
      socket.off("chat:typing",    onChatTyping);
      socket.emit("chat:presence", { bookingId, online: false });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [open, bookingId, authToken, senderRole, loadHistory]);


  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Typing indicator
  useEffect(() => {
    if (!bookingId || !socketRef.current) return;
    
    // Clear existing timer
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }
    
    // Emit typing event only if there's text
    if (inputText.trim().length > 0) {
      socketRef.current.emit("chat:typing", { bookingId, typing: true });
    }
    
    // Set timer to emit typing: false after user stops typing for 2 seconds
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit("chat:typing", { bookingId, typing: false });
    }, 2000);
    
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [inputText, bookingId]);


  useEffect(() => {
    let raf1, raf2, timeout;
    if (open) {
      setMounted(true);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      timeout = setTimeout(() => setMounted(false), 320);
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timeout);
    };
  }, [open]);


  useEffect(() => {
    if (open && !isSelectMode && !isLocked) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, isSelectMode, isLocked]);

  useEffect(() => {
    if (editingMsg) {
      setTimeout(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }, 50);
    }
  }, [editingMsg]);


  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || sending || isLocked) return;

    if (editingMsg) {
      if (text === editingMsg.originalText) { setEditingMsg(null); setInputText(""); return; }
      setMessages((prev) =>
        prev.map((m) => m.messageId === editingMsg.messageId ? { ...m, text, edited: true } : m)
      );
      socketRef.current?.emit("chat:edit", { bookingId, messageId: editingMsg.messageId, text });
      setEditingMsg(null);
      setInputText("");
      return;
    }

    // Normal send
    const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = { messageId, senderName, senderRole, text, timestamp: new Date().toISOString(), status: "sending" };
    pendingIds.current.add(messageId);
    seenIds.current.add(messageId);
    setMessages((prev) => [...prev, optimistic]);
    setInputText("");
    setSending(true);
    socketRef.current?.emit("chat:send", { bookingId, text, clientMsgId: messageId });
    setTimeout(() => setSending(false), 400);
  }, [inputText, sending, isLocked, editingMsg, senderName, senderRole, bookingId]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape" && editingMsg)  { cancelEdit(); }
  };

  const cancelEdit = useCallback(() => {
    setEditingMsg(null);
    setInputText("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);


  const enterSelectWithMsg = useCallback((msgId) => {
    setIsSelectMode(true);
    setSelectedIds(new Set([msgId]));
  }, []);

  const toggleTickSelect = useCallback((e, msgId) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
        if (next.size === 0) setIsSelectMode(false);
      } else {
        next.add(msgId);
      }
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const onBubbleDblClick = useCallback((msgId, isOwn) => {
    if (!isOwn || isLocked) return;
    if (dblClickTimer.current) { clearTimeout(dblClickTimer.current); dblClickTimer.current = null; }
    enterSelectWithMsg(msgId);
  }, [isLocked, enterSelectWithMsg]);

  const onBubbleTouchStart = useCallback((msgId, isOwn) => {
    if (!isOwn || isSelectMode || isLocked) return;
    longPressTimer.current = setTimeout(() => { enterSelectWithMsg(msgId); }, 500);
  }, [isSelectMode, isLocked, enterSelectWithMsg]);

  const onBubbleTouchEnd = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);


  const handleDeleteSelected = useCallback(() => {
    if (!selectedIds.size) return;
    const messageIds = [...selectedIds];
    setMessages((prev) => prev.filter((m) => !selectedIds.has(m.messageId)));
    messageIds.forEach((id) => seenIds.current.delete(id));
    setSelectedIds(new Set());
    setIsSelectMode(false);
    socketRef.current?.emit("chat:delete", { bookingId, messageIds });
  }, [selectedIds, bookingId]);


  const handleEditSelected = useCallback(() => {
    if (selectedIds.size !== 1) return;
    const msgId = [...selectedIds][0];
    const msg   = messages.find((m) => m.messageId === msgId);
    if (!msg) return;
    setEditingMsg({ messageId: msgId, originalText: msg.text });
    setInputText(msg.text);
    exitSelectMode();
  }, [selectedIds, messages, exitSelectMode]);

  useEffect(() => {
    if (!open || !automationAction || !bookingId || loading) return;

    const payload = automationAction && typeof automationAction === "object" ? automationAction : null;
    if (!payload) return;

    const actionId = String(payload.id || "").trim() || `${payload.action || "chat-action"}-${payload.bookingId || bookingId}`;
    if (processedAutomationIdsRef.current.has(actionId)) return;

    const targetBookingId = String(payload.bookingId || bookingId || "").trim();
    if (targetBookingId && String(bookingId || "").trim() && targetBookingId !== String(bookingId || "").trim()) {
      return;
    }

    const actionType = String(payload.action || "").toLowerCase();
    const replacementText = String(payload.replacementText || "").trim();
    const confirmed = payload.confirmed === true;

    const latestOwnMessage = [...messages]
      .reverse()
      .find((msg) => msg?.senderRole === senderRole && String(msg?.messageId || "").trim());

    if (!latestOwnMessage) {
      processedAutomationIdsRef.current.add(actionId);
      setAutomationNotice("No editable or deletable sent message found in this chat yet.");
      onAutomationHandled?.();
      return;
    }

    if (actionType === "edit_last") {
      if (!replacementText) {
        processedAutomationIdsRef.current.add(actionId);
        setAutomationNotice("Edit command needs replacement text. Example: edit last message to 'I will arrive in 10 minutes'.");
        onAutomationHandled?.();
        return;
      }

      if (!confirmed) {
        setEditingMsg({ messageId: latestOwnMessage.messageId, originalText: latestOwnMessage.text });
        setInputText(replacementText);
        setAutomationNotice("Draft prepared. To execute safely, send command with explicit confirm.");
        processedAutomationIdsRef.current.add(actionId);
        onAutomationHandled?.();
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.messageId === latestOwnMessage.messageId ? { ...msg, text: replacementText, edited: true } : msg
        )
      );
      socketRef.current?.emit("chat:edit", {
        bookingId,
        messageId: latestOwnMessage.messageId,
        text: replacementText
      });
      setEditingMsg(null);
      setInputText("");
      setAutomationNotice("Latest message edited from chatbot command.");
      processedAutomationIdsRef.current.add(actionId);
      onAutomationHandled?.();
      return;
    }

    if (actionType === "delete_last") {
      if (!confirmed) {
        setIsSelectMode(true);
        setSelectedIds(new Set([latestOwnMessage.messageId]));
        setAutomationNotice("Message selected. To delete safely, send command with explicit confirm.");
        processedAutomationIdsRef.current.add(actionId);
        onAutomationHandled?.();
        return;
      }

      const messageIds = [latestOwnMessage.messageId];
      setMessages((prev) => prev.filter((msg) => !messageIds.includes(msg.messageId)));
      messageIds.forEach((id) => seenIds.current.delete(id));
      setSelectedIds(new Set());
      setIsSelectMode(false);
      socketRef.current?.emit("chat:delete", { bookingId, messageIds });
      setAutomationNotice("Latest message deleted from chatbot command.");
      processedAutomationIdsRef.current.add(actionId);
      onAutomationHandled?.();
      return;
    }

    processedAutomationIdsRef.current.add(actionId);
    onAutomationHandled?.();
  }, [
    automationAction,
    bookingId,
    loading,
    messages,
    onAutomationHandled,
    open,
    senderRole
  ]);

  if (!mounted) return null;

  const selectedOwnCount = [...selectedIds].filter((id) =>
    messages.find((m) => m.messageId === id && m.senderRole === senderRole)
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${animating ? "opacity-100" : "opacity-0"}`}
        onClick={isSelectMode ? exitSelectMode : onClose}
      />

      {/* panel — slides up on mobile, centered on desktop */}
      <div className={`relative flex flex-col w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden h-[85dvh] sm:h-[72vh] transition-transform duration-300 ease-out sm:transition-none sm:!translate-y-0 ${animating ? "translate-y-0" : "translate-y-full"}`}>

        {/* ── header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
          {isSelectMode ? (
            <>
              <div className="flex items-center gap-3">
                <button type="button" onClick={exitSelectMode}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
                <span className="font-semibold text-gray-900 text-sm">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedOwnCount === 1 && (
                  <button type="button" onClick={handleEditSelected}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                {selectedOwnCount > 0 && (
                  <button type="button" onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                    {counterpartName || "Chat"}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className={`text-xs leading-tight ${otherOnline ? "text-green-500" : "text-gray-400"}`}>
                      {otherOnline ? "Online" : "Offline"}
                    </p>
                    {unreadCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                        <button
                          type="button"
                          onClick={handleMarkAllAsRead}
                          className="px-2 py-1 rounded text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Mark all as read"
                        >
                          Mark read
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button type="button" onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 shrink-0"
                aria-label="Close chat">
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* ── message list ── */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 overscroll-contain relative">
          {automationNotice && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
              {automationNotice}
            </div>
          )}
          {loading && <p className="text-center text-sm text-gray-400 py-8">Loading messages...</p>}
          {!loading && error && <p className="text-center text-sm text-red-500 py-6">{error}</p>}
          {!loading && !error && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
              <MessageCircle className="w-8 h-8 opacity-40" />
              <p className="text-sm">No messages yet. Say hello!</p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isOwn      = msg.senderRole === senderRole;
            const isSelected = selectedIds.has(msg.messageId);
            return (
              <div
                key={msg.messageId || idx}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {/* inner column — capped at 75% of the panel so text wraps at that boundary */}
                <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                  {!isOwn && (
                    <span className="text-xs text-gray-500 px-1 font-medium">{msg.senderName}</span>
                  )}

                  <div className={`flex items-end gap-2 ${isOwn ? "flex-row" : "flex-row-reverse"}`}>
                    {/* tick circle — only in select mode, own messages */}
                    {isSelectMode && isOwn && (
                      <div
                        onClick={(e) => toggleTickSelect(e, msg.messageId)}
                        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center mb-1 cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-600 border-blue-600" : "border-gray-400 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    )}

                    {/* bubble — no max-w here; the outer wrapper controls the limit */}
                    <div
                      className={`min-w-0 px-3.5 py-2 rounded-2xl text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap shadow-sm transition-colors select-none ${
                        isOwn
                          ? `text-white rounded-br-sm ${isSelected ? "bg-blue-400" : msg.status === "failed" ? "bg-red-500 opacity-80" : "bg-blue-600"}`
                          : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                      }`}
                      onDoubleClick={() => onBubbleDblClick(msg.messageId, isOwn)}
                      onTouchStart={() => onBubbleTouchStart(msg.messageId, isOwn)}
                      onTouchEnd={onBubbleTouchEnd}
                      onTouchMove={onBubbleTouchEnd}
                    >
                      {msg.text}
                      {isOwn && msg.status === "failed" && (
                        <span className="ml-2 text-xs italic opacity-75">Failed to send</span>
                      )}
                    </div>
                  </div>

                  {/* time + tick + edited + actions */}
                  <div className={`flex items-center gap-1 px-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-[10px] text-gray-400">{formatMsgTime(msg.timestamp)}</span>
                    {msg.edited && (
                      <span className="text-[10px] text-gray-400 italic">edited</span>
                    )}
                    {isOwn && <TickIcon status={msg.status} />}
                    {!isOwn && !isSelectMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setInputText(`"${msg.text.slice(0, 50)}..."`);
                          inputRef.current?.focus();
                        }}
                        className="text-gray-400 hover:text-blue-600 p-0.5 rounded text-[10px] font-medium"
                        title="Reply to this message"
                      >
                        ↩
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {otherIsTyping && (
            <div className="flex justify-start">
              <div className="flex gap-1 px-4 py-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          
          {showJumpButton && (
            <div className="sticky bottom-4 flex justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAutoScroll(true);
                  scrollToBottom();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-md"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                Latest
              </button>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* ── input / locked / edit mode ── */}
        {isLocked ? (
          <div className="px-4 py-3 border-t bg-gray-50 shrink-0 text-center">
            <p className="text-sm text-gray-400 italic">Chat closed — this booking has ended.</p>
          </div>
        ) : (
          <div className="border-t bg-white shrink-0">
            {/* edit banner */}
            {editingMsg && (
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                  <Pencil className="w-3 h-3" />
                  Editing message
                </div>
                <button type="button" onClick={cancelEdit}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="px-3 py-2.5">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={editingMsg ? "Edit message…" : "Type a message…"}
                  maxLength={1000}
                  className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto leading-relaxed"
                  style={{ maxHeight: "7rem" }}
                />
                <button type="button" onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors"
                  aria-label={editingMsg ? "Save edit" : "Send"}>
                  {editingMsg ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-right text-[10px] text-gray-400 mt-0.5 pr-12">
                {inputText.length}/1000{!editingMsg && " · Enter to send"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatModal;
