import { useCallback, useEffect, useState } from "react";
import api from "../../api";
import { toStableId } from "@shared/utils/common";
import { createRealtimeSocket } from "@shared/utils/realtime";

const EMPTY_STATS = { totalEarnings: 0, completedJobs: 0, averageRating: 0, pendingRequests: 0 };

export default function useWorkerDashboardData({ authToken, userName, needsDashboardData }) {
    const [stats, setStats] = useState(EMPTY_STATS);
    const [jobRequests, setJobRequests] = useState([]);
    const [scheduleJobs, setScheduleJobs] = useState([]);
    const [recentJobs, setRecentJobs] = useState([]);
    const [reviews, setReviews] = useState([]);

    const loadDashboard = useCallback(async ({ forceFresh = true } = {}) => {
        try {
            const requestConfig = {
                params: authToken ? {} : { worker: userName },
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                ...(forceFresh ? { cache: false } : {})
            };
            const [dashboardResponse, reviewsResponse] = await Promise.all([
                api.get("/worker/dashboard", requestConfig),
                api.get("/worker/reviews", requestConfig)
            ]);
            const response = dashboardResponse;
            const nextStats = response.data?.stats || {};
            setStats({
                totalEarnings: Number(nextStats.totalEarnings || 0),
                completedJobs: Number(nextStats.completedJobs || 0),
                averageRating: Number(nextStats.averageRating || 0),
                pendingRequests: Number(nextStats.pendingRequests || 0)
            });
            setJobRequests(
                Array.isArray(response.data?.jobRequests)
                    ? response.data.jobRequests.map((job) => ({
                        id: toStableId(job._id || job.id, `${job.customerName}-${job.service}-${job.date}-${job.time}`),
                        customer: job.customerName || "Customer",
                        service: job.service || "Service",
                        location: job.location || "",
                        date: job.date || "",
                        time: job.time || "",
                        amount: Number(job.amount || 0),
                        status: job.status || "pending"
                    }))
                    : []
            );
            setScheduleJobs(
                Array.isArray(response.data?.scheduleJobs)
                    ? response.data.scheduleJobs.map((job) => ({
                        id: toStableId(job._id || job.id, `${job.customerName}-${job.service}-${job.date}-${job.time}`),
                        customer: job.customerName || "Customer",
                        customerName: job.customerName || "Customer",
                        service: job.service || "Service",
                        location: job.location || "",
                        locationLat: typeof job.locationLat === "number" ? job.locationLat : null,
                        locationLng: typeof job.locationLng === "number" ? job.locationLng : null,
                        date: job.date || "",
                        time: job.time || "",
                        amount: Number(job.amount || 0),
                        status: job.status || "confirmed"
                    }))
                    : []
            );
            setRecentJobs(
                Array.isArray(response.data?.recentJobs)
                    ? response.data.recentJobs.map((job) => ({
                        id: toStableId(job._id || job.id, `${job.customerName}-${job.service}-${job.amount}`),
                        customer: job.customerName || "Customer",
                        service: job.service || "Service",
                        grossAmount: Number(job.amount || 0),
                        brokerCommissionAmount: Number(job.brokerCommissionAmount || 0),
                        amount: Number(job.workerPayout || job.amount || 0),
                        rating: Number(job.rating || 0),
                        feedback: String(job.feedback || ""),
                        status: job.status || "completed"
                    }))
                    : []
            );
            setReviews(
                Array.isArray(reviewsResponse.data?.reviews)
                    ? reviewsResponse.data.reviews.map((review) => ({
                        id: toStableId(review._id || review.id, `${review.customer}-${review.service}-${review.date}-${review.time}`),
                        customer: review.customer || review.customerName || "Customer",
                        service: review.service || "Service",
                        rating: Number(review.rating || 0),
                        feedback: String(review.feedback || ""),
                        feedbackMedia: Array.isArray(review.feedbackMedia)
                            ? review.feedbackMedia
                                .map((media) => ({
                                    kind: media?.kind === "video" ? "video" : "image",
                                    mimeType: String(media?.mimeType || ""),
                                    dataUrl: String(media?.dataUrl || "").trim()
                                }))
                                .filter((media) => media.dataUrl)
                            : [],
                        amount: Number(review.amount || 0),
                        date: review.date || "",
                        time: review.time || ""
                    }))
                    : []
            );
        } catch (_error) {
            setStats(EMPTY_STATS);
            setJobRequests([]);
            setScheduleJobs([]);
            setRecentJobs([]);
            setReviews([]);
        }
    }, [authToken, userName]);

    useEffect(() => {
        if (!needsDashboardData) return;
        loadDashboard();
    }, [loadDashboard, needsDashboardData]);

    useEffect(() => {
        if (!authToken || !needsDashboardData) return;
        const intervalId = window.setInterval(() => loadDashboard(), 15000);
        return () => window.clearInterval(intervalId);
    }, [authToken, loadDashboard, needsDashboardData]);

    useEffect(() => {
        if (!authToken) return undefined;
        const socket = createRealtimeSocket(authToken);
        if (!socket) return undefined;
        let refreshTimerId = null;
        const triggerFreshReload = () => {
            if (refreshTimerId) window.clearTimeout(refreshTimerId);
            refreshTimerId = window.setTimeout(() => {
                api.clearApiCache?.();
                loadDashboard({ forceFresh: true });
            }, 250);
        };
        socket.on("connect", triggerFreshReload);
        socket.on("booking:changed", triggerFreshReload);
        return () => {
            if (refreshTimerId) window.clearTimeout(refreshTimerId);
            socket.off("connect", triggerFreshReload);
            socket.off("booking:changed", triggerFreshReload);
            socket.disconnect();
        };
    }, [authToken, loadDashboard]);

    return { stats, jobRequests, scheduleJobs, recentJobs, reviews, loadDashboard };
}
