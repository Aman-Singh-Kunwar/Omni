import { useCallback, useEffect, useMemo, useState } from "react";
import { toStableId } from "@shared/utils/common";

export default function useCustomerNotifications({ userEmail, userName, recentBookings }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [readNotificationIds, setReadNotificationIds] = useState([]);
    const [clearedNotificationIds, setClearedNotificationIds] = useState([]);
    const [notificationsHydrated, setNotificationsHydrated] = useState(false);

    const notificationStorageKey = useMemo(
        () => `omni:notifications:customer:${String(userEmail || userName || "customer").trim().toLowerCase()}`,
        [userEmail, userName]
    );

    const notificationItems = useMemo(() => {
        const items = [];
        recentBookings.forEach((booking) => {
            const bookingId = toStableId(booking.id, `${booking.service}-${booking.date}-${booking.time}-${booking.createdAt}`);
            const status = String(booking.status || "").toLowerCase();
            const bookingTimeLabel = booking.date ? `${booking.date}${booking.time ? ` at ${booking.time}` : ""}` : "recently";
            const serviceLabel = booking.service || "service";

            if (["confirmed", "upcoming", "in-progress"].includes(status)) {
                items.push({
                    id: `booking-confirmed-${bookingId}`,
                    title: "Booking confirmed",
                    message: `${serviceLabel} booking is confirmed for ${bookingTimeLabel}.`,
                    targetTab: "bookings"
                });
            }
            if (status === "completed") {
                items.push({
                    id: `payment-done-${bookingId}`,
                    title: "Payment done",
                    message: `Payment completed for ${serviceLabel}.`,
                    targetTab: "bookings"
                });
            }
            if (typeof booking.rating === "number" || String(booking.feedback || "").trim()) {
                items.push({
                    id: `feedback-submitted-${bookingId}`,
                    title: "Feedback submitted",
                    message: `Feedback updated for ${serviceLabel}.`,
                    targetTab: "bookings"
                });
            }
        });
        return items.slice(0, 20);
    }, [recentBookings]);

    const visibleNotificationItems = useMemo(() => {
        const clearedIds = new Set(clearedNotificationIds.map((id) => toStableId(id)).filter(Boolean));
        return notificationItems.filter((n) => !clearedIds.has(toStableId(n.id)));
    }, [notificationItems, clearedNotificationIds]);

    const unreadNotificationCount = useMemo(() => {
        const readIds = new Set(readNotificationIds.map((id) => toStableId(id)).filter(Boolean));
        return visibleNotificationItems.filter((n) => !readIds.has(toStableId(n.id))).length;
    }, [visibleNotificationItems, readNotificationIds]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(notificationStorageKey);
            const parsed = raw ? JSON.parse(raw) : null;
            setReadNotificationIds(Array.isArray(parsed?.readIds) ? parsed.readIds.map((id) => toStableId(id)).filter(Boolean) : []);
            setClearedNotificationIds(Array.isArray(parsed?.clearedIds) ? parsed.clearedIds.map((id) => toStableId(id)).filter(Boolean) : []);
        } catch (_error) {
            setReadNotificationIds([]);
            setClearedNotificationIds([]);
        } finally {
            setNotificationsHydrated(true);
        }
    }, [notificationStorageKey]);

    useEffect(() => {
        if (!notificationsHydrated) return;
        try {
            localStorage.setItem(
                notificationStorageKey,
                JSON.stringify({ readIds: readNotificationIds, clearedIds: clearedNotificationIds })
            );
        } catch (_error) {
            // Ignore
        }
    }, [notificationStorageKey, notificationsHydrated, readNotificationIds, clearedNotificationIds]);

    const handleMarkNotificationRead = useCallback((notificationId) => {
        const normalizedId = toStableId(notificationId);
        if (!normalizedId) return;
        setReadNotificationIds((prev) => (prev.includes(normalizedId) ? prev : [...prev, normalizedId]));
    }, []);

    const handleMarkAllNotificationsRead = useCallback(() => {
        const nextIds = visibleNotificationItems.map((n) => toStableId(n.id)).filter(Boolean);
        setReadNotificationIds((prev) => Array.from(new Set([...prev, ...nextIds])));
    }, [visibleNotificationItems]);

    const handleClearNotifications = useCallback(() => {
        const nextIds = visibleNotificationItems.map((n) => toStableId(n.id)).filter(Boolean);
        setClearedNotificationIds((prev) => Array.from(new Set([...prev, ...nextIds])));
    }, [visibleNotificationItems]);

    return {
        showNotifications, setShowNotifications,
        readNotificationIds,
        visibleNotificationItems,
        unreadNotificationCount,
        handleMarkNotificationRead,
        handleMarkAllNotificationsRead,
        handleClearNotifications
    };
}
