import { useCallback, useEffect, useState } from "react";
import api from "../../api";
import { toStableId } from "@shared/utils/common";
import { createRealtimeSocket } from "@shared/utils/realtime";
import { EMPTY_STATS } from "./constants";

export default function useBrokerDashboardData({ authToken, setProfileForm, setProfileInitialForm }) {
    const [stats, setStats] = useState(EMPTY_STATS);
    const [recentBookings, setRecentBookings] = useState([]);
    const [topWorkers, setTopWorkers] = useState([]);
    const [refreshSignal, setRefreshSignal] = useState(0);

    const loadDashboard = useCallback(
        async ({ forceFresh = true } = {}) => {
            try {
                const response = await api.get("/broker/dashboard", {
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                    ...(forceFresh ? { cache: false } : {})
                });
                const nextStats = response.data?.stats || {};
                setStats({
                    totalWorkers: Number(nextStats.totalWorkers || 0),
                    activeBookings: Number(nextStats.activeBookings || 0),
                    totalEarnings: Number(nextStats.totalEarnings || 0),
                    monthlyGrowth: Number(nextStats.monthlyGrowth || 0)
                });
                setRecentBookings(
                    Array.isArray(response.data?.recentBookings)
                        ? response.data.recentBookings.map((booking) => ({
                            id: toStableId(booking.id || booking._id, `${booking.customer}-${booking.service}-${booking.status}`),
                            customer: booking.customer || "Customer",
                            service: booking.service || "Service",
                            worker: booking.worker || "Worker",
                            commission: Number(booking.commission || 0),
                            status: booking.status || "pending"
                        }))
                        : []
                );
                setTopWorkers(Array.isArray(response.data?.topWorkers) ? response.data.topWorkers : []);
                if (response.data?.brokerCode) {
                    setProfileForm?.((prev) => ({ ...prev, brokerCode: response.data.brokerCode }));
                    setProfileInitialForm?.((prev) => ({ ...prev, brokerCode: response.data.brokerCode }));
                }
            } catch (_error) {
                setStats({ ...EMPTY_STATS });
                setRecentBookings([]);
                setTopWorkers([]);
            }
        },
        [authToken, setProfileForm, setProfileInitialForm]
    );

    // Clear data when logged out
    useEffect(() => {
        if (authToken) return;
        setStats({ ...EMPTY_STATS });
        setRecentBookings([]);
        setTopWorkers([]);
    }, [authToken]);

    // Initial load
    useEffect(() => {
        if (!authToken) return;
        loadDashboard();
    }, [authToken, loadDashboard]);

    // Polling refresh
    useEffect(() => {
        if (!authToken) return;
        const intervalId = window.setInterval(() => loadDashboard(), 15000);
        return () => window.clearInterval(intervalId);
    }, [authToken, loadDashboard]);

    // Realtime refresh via Socket.IO
    useEffect(() => {
        if (!authToken) return undefined;
        const socket = createRealtimeSocket(authToken);
        if (!socket) return undefined;

        let refreshTimerId = null;
        const triggerRealtimeRefresh = () => {
            if (refreshTimerId) window.clearTimeout(refreshTimerId);
            refreshTimerId = window.setTimeout(() => {
                api.clearApiCache?.();
                setRefreshSignal((prev) => prev + 1);
                loadDashboard({ forceFresh: true });
            }, 250);
        };

        socket.on("connect", triggerRealtimeRefresh);
        socket.on("booking:changed", triggerRealtimeRefresh);

        return () => {
            if (refreshTimerId) window.clearTimeout(refreshTimerId);
            socket.off("connect", triggerRealtimeRefresh);
            socket.off("booking:changed", triggerRealtimeRefresh);
            socket.disconnect();
        };
    }, [authToken, loadDashboard]);

    return { stats, recentBookings, topWorkers, refreshSignal, loadDashboard };
}
