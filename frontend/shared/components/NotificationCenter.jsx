import React, { useState, useCallback } from "react";
import { X, Bell, MessageSquare, AlertCircle, CheckCircle, Clock } from "lucide-react";

/**
 * NotificationCenter - Unified notification management with:
 * - Notification badge counter on bell icon
 * - Categorized notifications (messages, bookings, alerts)
 * - Mark as read / Mark all as read
 * - Delete / Clear all notifications
 * - Real-time notification indicators
 * - Grouped notifications by type
 * - Notification animation and transitions
 * - Empty state messaging
 * - Responsive notification drawer
 */

const NOTIFICATION_TYPES = {
  message: {
    icon: MessageSquare,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeColor: "bg-blue-500",
    textColor: "text-blue-700",
  },
  booking: {
    icon: Clock,
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    badgeColor: "bg-emerald-500",
    textColor: "text-emerald-700",
  },
  alert: {
    icon: AlertCircle,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    badgeColor: "bg-amber-500",
    textColor: "text-amber-700",
  },
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    badgeColor: "bg-green-500",
    textColor: "text-green-700",
  },
};

function NotificationCenter({
  notifications = [],
  onNotificationRead = () => {},
  onNotificationDelete = () => {},
  onClearAll = () => {},
  onMarkAllAsRead = () => {},
}) {
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group notifications by type
  const groupedNotifications = notifications.reduce((acc, notif) => {
    const type = notif.type || "alert";
    if (!acc[type]) acc[type] = [];
    acc[type].push(notif);
    return acc;
  }, {});

  const handleNotificationClick = useCallback(
    (notification) => {
      if (!notification.read) {
        onNotificationRead?.(notification.id);
      }
      if (notification.action) {
        notification.action();
      }
    },
    [onNotificationRead]
  );

  const handleDelete = useCallback(
    (e, notificationId) => {
      e.stopPropagation();
      onNotificationDelete?.(notificationId);
    },
    [onNotificationDelete]
  );

  return (
    <div className="relative">
      {/* Bell icon button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center h-5 w-5 px-1 rounded-full text-xs font-bold bg-red-500 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setOpen(false)}
          />

          {/* Drawer panel */}
          <div className="absolute right-0 top-full mt-1 w-96 max-h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-gray-50 shrink-0">
              <h2 className="font-semibold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => onMarkAllAsRead?.()}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto space-y-1 p-2">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Bell className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                Object.entries(groupedNotifications).map(([type, notifs]) => (
                  <div key={type} className="py-2">
                    {/* Type header */}
                    <p className="text-xs font-semibold text-gray-600 uppercase px-3 py-1">
                      {type === "message"
                        ? "Messages"
                        : type === "booking"
                          ? "Bookings"
                          : type === "alert"
                            ? "Alerts"
                            : "Updates"}
                    </p>

                    {/* Notifications of this type */}
                    {notifs.map((notif) => {
                      const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.alert;
                      const Icon = config.icon;

                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`mx-1 px-3 py-2 rounded-lg cursor-pointer transition-all group ${
                            notif.read
                              ? "bg-gray-50 text-gray-700 hover:bg-gray-100"
                              : `${config.bgColor} ${config.textColor} border ${config.borderColor} hover:opacity-90`
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-1">
                                {notif.title}
                              </p>
                              <p className="text-xs opacity-90 line-clamp-2 mt-0.5">
                                {notif.description}
                              </p>
                              <p className="text-[10px] opacity-70 mt-1">
                                {new Date(notif.timestamp).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, notif.id)}
                              className="flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all rounded"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {!notif.read && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 shrink-0 text-center">
                <button
                  type="button"
                  onClick={() => onClearAll?.()}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationCenter;

/**
 * Inline Badge Component - Reusable notification badge
 */
export function NotificationBadge({
  count = 0,
  variant = "default", // default, success, warning, error
  size = "md", // sm, md, lg
}) {
  const variants = {
    default: "bg-blue-500",
    success: "bg-green-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
  };

  const sizes = {
    sm: "h-4 w-4 text-[9px]",
    md: "h-5 w-5 text-xs",
    lg: "h-6 w-6 text-sm",
  };

  if (count === 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center font-bold text-white rounded-full ${variants[variant]} ${sizes[size]}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Toast Notification Component - One-time notifications (temporary)
 */
export function Toast({
  message = "",
  type = "info", // info, success, warning, error
  duration = 4000,
  onClose = () => {},
}) {
  const [visible, setVisible] = useState(true);

  React.useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose, visible]);

  if (!visible) return null;

  const typeConfig = {
    info: { bgColor: "bg-blue-100", borderColor: "border-blue-300", textColor: "text-blue-700", icon: "ℹ️" },
    success: { bgColor: "bg-green-100", borderColor: "border-green-300", textColor: "text-green-700", icon: "✓" },
    warning: { bgColor: "bg-amber-100", borderColor: "border-amber-300", textColor: "text-amber-700", icon: "⚠️" },
    error: { bgColor: "bg-red-100", borderColor: "border-red-300", textColor: "text-red-700", icon: "✕" },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg border ${config.bgColor} ${config.borderColor} ${config.textColor} max-w-sm animate-in fade-in slide-in-from-bottom-4`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.icon}</span>
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}
