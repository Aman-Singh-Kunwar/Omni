import { useState } from "react";
import api from "../../api";
import { useAutoDismissStatus } from "@shared/hooks/useAutoDismissNotice";

export default function useCustomerBookingActions({ authToken, loadDashboard }) {
    const [cancelStatus, setCancelStatus] = useState({ loadingBookingId: "", error: "" });
    const [paymentStatus, setPaymentStatus] = useState({ loadingBookingId: "", error: "" });
    const [notProvidedStatus, setNotProvidedStatus] = useState({ loadingBookingId: "", error: "" });
    const [deleteStatus, setDeleteStatus] = useState({ loadingBookingId: "", error: "" });
    const [reviewStatus, setReviewStatus] = useState({ loadingBookingId: "", error: "" });
    useAutoDismissStatus(cancelStatus, setCancelStatus);
    useAutoDismissStatus(paymentStatus, setPaymentStatus);
    useAutoDismissStatus(notProvidedStatus, setNotProvidedStatus);
    useAutoDismissStatus(deleteStatus, setDeleteStatus);
    useAutoDismissStatus(reviewStatus, setReviewStatus);

    const handleCancelBooking = async (bookingId) => {
        if (!authToken) { setCancelStatus({ loadingBookingId: "", error: "Please log in to cancel bookings." }); return; }
        setCancelStatus({ loadingBookingId: bookingId, error: "" });
        setPaymentStatus((prev) => ({ ...prev, error: "" }));
        try {
            await api.patch(`/customer/bookings/${bookingId}/cancel`, {}, { headers: { Authorization: `Bearer ${authToken}` } });
            setCancelStatus({ loadingBookingId: "", error: "" });
            await loadDashboard();
        } catch (error) {
            setCancelStatus({ loadingBookingId: "", error: error.response?.data?.message || "Unable to cancel this booking right now." });
        }
    };

    const handlePayBooking = async (bookingId) => {
        if (!authToken) { setPaymentStatus({ loadingBookingId: "", error: "Please log in to continue payment." }); return; }
        setPaymentStatus({ loadingBookingId: bookingId, error: "" });
        setCancelStatus((prev) => ({ ...prev, error: "" }));
        try {
            await api.patch(`/customer/bookings/${bookingId}/pay`, {}, { headers: { Authorization: `Bearer ${authToken}` } });
            setPaymentStatus({ loadingBookingId: "", error: "" });
            await loadDashboard();
        } catch (error) {
            setPaymentStatus({ loadingBookingId: "", error: error.response?.data?.message || "Unable to complete payment right now." });
        }
    };

    const handleDeleteBooking = async (bookingId) => {
        if (!authToken) { setDeleteStatus({ loadingBookingId: "", error: "Please log in to delete bookings." }); return; }
        setDeleteStatus({ loadingBookingId: bookingId, error: "" });
        setCancelStatus((prev) => ({ ...prev, error: "" }));
        setPaymentStatus((prev) => ({ ...prev, error: "" }));
        try {
            await api.delete(`/customer/bookings/${bookingId}`, { headers: { Authorization: `Bearer ${authToken}` } });
            setDeleteStatus({ loadingBookingId: "", error: "" });
            await loadDashboard();
        } catch (error) {
            setDeleteStatus({ loadingBookingId: "", error: error.response?.data?.message || "Unable to delete this booking right now." });
        }
    };

    const handleMarkServiceNotProvided = async (bookingId) => {
        if (!authToken) { setNotProvidedStatus({ loadingBookingId: "", error: "Please log in to report booking issues." }); return; }
        setNotProvidedStatus({ loadingBookingId: bookingId, error: "" });
        setCancelStatus((prev) => ({ ...prev, error: "" }));
        setPaymentStatus((prev) => ({ ...prev, error: "" }));
        try {
            await api.patch(`/customer/bookings/${bookingId}/not-provided`, {}, { headers: { Authorization: `Bearer ${authToken}` } });
            setNotProvidedStatus({ loadingBookingId: "", error: "" });
            await loadDashboard();
        } catch (error) {
            setNotProvidedStatus({ loadingBookingId: "", error: error.response?.data?.message || "Unable to mark this booking right now." });
        }
    };

    const handleSubmitReview = async (bookingId, { rating, feedback, feedbackMedia = [] }) => {
        if (!authToken) { setReviewStatus({ loadingBookingId: "", error: "Please log in to submit review." }); return false; }
        setReviewStatus({ loadingBookingId: bookingId, error: "" });
        try {
            await api.patch(
                `/customer/bookings/${bookingId}/review`,
                { rating, feedback, feedbackMedia },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            setReviewStatus({ loadingBookingId: "", error: "" });
            await loadDashboard();
            return true;
        } catch (error) {
            const statusCode = Number(error?.response?.status || 0);
            const backendMessage = String(error?.response?.data?.message || "").trim();
            const fallbackMessage =
                statusCode === 413
                    ? "Uploaded file is too large for review upload. Please use smaller image/video."
                    : "Unable to submit review right now.";
            setReviewStatus({ loadingBookingId: "", error: backendMessage || fallbackMessage });
            return false;
        }
    };

    return {
        cancelStatus, paymentStatus, notProvidedStatus, deleteStatus, reviewStatus,
        handleCancelBooking, handlePayBooking, handleDeleteBooking,
        handleMarkServiceNotProvided, handleSubmitReview
    };
}
