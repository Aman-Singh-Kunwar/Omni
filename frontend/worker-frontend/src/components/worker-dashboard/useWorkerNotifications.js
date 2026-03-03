import { useCallback, useEffect, useMemo, useState } from "react";
import { toStableId } from "@shared/utils/common";

export default function useWorkerNotifications({ userEmail, userName, jobRequests, recentJobs }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [readNotificationIds, setReadNotificationIds] = useState([]);
    const [clearedNotificationIds, setClearedNotificationIds] = useState([]);
    const [notificationsHydrated, setNotificationsHydrated] = useState(false);

    const notificationStorageKey = useMemo(
        () => `omni:notifications:worker:${String(userEmail || userName || "worker").trim().toLowerCase()}`,
        [userEmail, userName]
    );

    const notificationItems = useMemo(() => {
        const items = [];
        jobRequests.forEach((job) => {
            if (String(job.status || "").toLowerCase() === "pending") {
                const jobId = toStableId(job.id, `${job.customer}-${job.service}-${job.date}-${job.time}`);
                items.push({
                    id: `job-request-${jobId}`,
                    title: "New job request",
                    message: `${job.customer} requested ${job.service}${job.date ? ` on ${job.date}` : ""}.`,
                    targetTab: "job-requests"
                });
            }
        });
        recentJobs.forEach((job) => {
            const jobId = toStableId(job.id, `${job.customer}-${job.service}-${job.amount}`);
            items.push({
                id: `job-done-${jobId}`,
                title: "Job marked as done",
                message: `${job.service} completed for ${job.customer}.`,
                targetTab: "overview"
            });
            if (Number(job.amount || 0) > 0) {
                items.push({
                    id: `earning-${jobId}`,
                    title: "Earning credited",
                    message: `INR ${Number(job.amount || 0).toLocaleString("en-IN")} added from ${job.service}.`,
                    targetTab: "earnings"
                });
            }
        });
        return items.slice(0, 20);
    }, [jobRequests, recentJobs]);

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
