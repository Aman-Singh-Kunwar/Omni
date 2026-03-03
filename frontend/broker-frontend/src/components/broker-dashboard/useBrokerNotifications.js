import { useCallback, useEffect, useMemo, useState } from "react";
import { toStableId } from "@shared/utils/common";

export default function useBrokerNotifications({ userEmail, userName, recentBookings, stats }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [readNotificationIds, setReadNotificationIds] = useState([]);
    const [clearedNotificationIds, setClearedNotificationIds] = useState([]);
    const [notificationsHydrated, setNotificationsHydrated] = useState(false);

    const notificationStorageKey = useMemo(
        () => `omni:notifications:broker:${String(userEmail || userName || "broker").trim().toLowerCase()}`,
        [userEmail, userName]
    );

    const notificationItems = useMemo(() => {
        const items = [];
        recentBookings.forEach((booking) => {
            const bookingId = toStableId(booking.id, `${booking.customer}-${booking.service}-${booking.status}`);
            const status = String(booking.status || "").toLowerCase();
            const serviceLabel = booking.service || "service";
            const customerLabel = booking.customer || "customer";

            if (["pending", "confirmed", "in-progress", "upcoming"].includes(status)) {
                items.push({
                    id: `broker-request-${bookingId}`,
                    title: "New booking request",
                    message: `${customerLabel} requested ${serviceLabel}.`,
                    targetTab: "bookings"
                });
            }
            if (status === "completed") {
                items.push({
                    id: `broker-job-done-${bookingId}`,
                    title: "Job done",
                    message: `${serviceLabel} completed by ${booking.worker || "worker"}.`,
                    targetTab: "bookings"
                });
                if (Number(booking.commission || 0) > 0) {
                    items.push({
                        id: `broker-earning-${bookingId}`,
                        title: "Earning credited",
                        message: `INR ${Number(booking.commission || 0).toLocaleString("en-IN")} commission added.`,
                        targetTab: "earnings"
                    });
                }
            }
        });
        if (Number(stats.activeBookings || 0) > 0) {
            items.push({
                id: "broker-active-bookings",
                title: "Active bookings",
                message: `${Number(stats.activeBookings)} active bookings in your network.`,
                targetTab: "bookings"
            });
        }
        return items.slice(0, 20);
    }, [recentBookings, stats.activeBookings]);

    const visibleNotificationItems = useMemo(() => {
        const clearedIds = new Set(clearedNotificationIds.map((id) => toStableId(id)).filter(Boolean));
        return notificationItems.filter((n) => !clearedIds.has(toStableId(n.id)));
    }, [notificationItems, clearedNotificationIds]);

    const unreadNotificationCount = useMemo(() => {
        const readIds = new Set(readNotificationIds.map((id) => toStableId(id)).filter(Boolean));
        return visibleNotificationItems.filter((n) => !readIds.has(toStableId(n.id))).length;
    }, [visibleNotificationItems, readNotificationIds]);

    // Hydrate from localStorage
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

    // Persist to localStorage
    useEffect(() => {
        if (!notificationsHydrated) return;
        try {
            localStorage.setItem(
                notificationStorageKey,
                JSON.stringify({ readIds: readNotificationIds, clearedIds: clearedNotificationIds })
            );
        } catch (_error) {
            // Ignore storage errors
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
        showNotifications,
        setShowNotifications,
        readNotificationIds,
        visibleNotificationItems,
        unreadNotificationCount,
        handleMarkNotificationRead,
        handleMarkAllNotificationsRead,
        handleClearNotifications
    };
}
