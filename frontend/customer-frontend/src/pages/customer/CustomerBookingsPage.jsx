import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Car, Clock3, CreditCard, Droplets, Home, Mail, MessageCircle, Navigation, Paintbrush, Phone, Scissors, Trash2, Wind, Wrench, Zap } from "lucide-react";
import LiveTrackingModal from "../../components/LiveTrackingModal";
import ChatModal from "@shared/components/ChatModal";

const CANCEL_WINDOW_MS = 10 * 60 * 1000;
const cancelEligibleStatuses = new Set(["pending", "confirmed", "upcoming"]);
const reviewEligibleStatuses = new Set(["confirmed", "in-progress", "completed", "not-provided"]);
const trackEligibleStatuses = new Set(["confirmed", "in-progress", "upcoming"]);
const chatEligibleStatuses = new Set(["confirmed", "in-progress", "upcoming"]);
const SERVICE_VISUALS = [
  { tokens: ["plumber", "plumbing"], icon: Droplets, containerClass: "bg-blue-100", iconClass: "text-blue-600" },
  { tokens: ["electrician", "electrical"], icon: Zap, containerClass: "bg-yellow-100", iconClass: "text-yellow-600" },
  { tokens: ["carpenter", "carpentry"], icon: Wrench, containerClass: "bg-orange-100", iconClass: "text-orange-600" },
  { tokens: ["painter", "painting"], icon: Paintbrush, containerClass: "bg-green-100", iconClass: "text-green-600" },
  { tokens: ["ac repair", "ac service", "air conditioning"], icon: Wind, containerClass: "bg-cyan-100", iconClass: "text-cyan-600" },
  { tokens: ["house cleaning", "cleaning"], icon: Home, containerClass: "bg-purple-100", iconClass: "text-purple-600" },
  { tokens: ["hair stylist", "hair", "salon"], icon: Scissors, containerClass: "bg-pink-100", iconClass: "text-pink-600" },
  { tokens: ["car service", "car wash", "vehicle"], icon: Car, containerClass: "bg-gray-200", iconClass: "text-gray-700" }
];

function formatStatusLabel(status) {
  return String(status || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRemainingMs(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getServiceVisual(serviceName) {
  const normalizedName = String(serviceName || "").trim().toLowerCase();
  const matched = SERVICE_VISUALS.find((entry) => entry.tokens.some((token) => normalizedName.includes(token)));
  return (
    matched || {
      icon: Wrench,
      containerClass: "bg-blue-100",
      iconClass: "text-blue-600"
    }
  );
}

function CustomerBookingsPage({
  recentBookings,
  getStatusColor,
  renderStars,
  onCancelBooking,
  onPayBooking,
  onMarkServiceNotProvided,
  onDeleteBooking,
  onSubmitReview,
  cancelLoadingBookingId = "",
  cancelError = "",
  payLoadingBookingId = "",
  payError = "",
  notProvidedLoadingBookingId = "",
  notProvidedError = "",
  deleteLoadingBookingId = "",
  deleteError = "",
  reviewLoadingBookingId = "",
  reviewError = "",
  authToken = "",
  userName = ""
}) {
  const navigate = useNavigate();
  const [trackingBooking, setTrackingBooking] = useState(null);
  const [chatBooking, setChatBooking] = useState(null);
  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };
  const [nowTs, setNowTs] = useState(Date.now());
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [openReviewByBookingId, setOpenReviewByBookingId] = useState({});

  useEffect(() => {
    const timerId = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const getRemainingMs = (booking) => {
    const createdAtTs = new Date(booking.createdAt || "").getTime();
    if (!Number.isFinite(createdAtTs)) {
      return 0;
    }
    return createdAtTs + CANCEL_WINDOW_MS - nowTs;
  };

  const canCancelBooking = (booking) => cancelEligibleStatuses.has(booking.status) && getRemainingMs(booking) > 0;

  useEffect(() => {
    setReviewDrafts((prev) => {
      const next = { ...prev };
      recentBookings.forEach((booking) => {
        next[booking.id] = {
          rating: booking.rating || 0,
          feedback: booking.feedback || ""
        };
      });
      return next;
    });
  }, [recentBookings]);

  return (
    <>
    <div className="bg-white/80 p-6 sm:p-8 rounded-xl shadow-sm border">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-gray-900">My Bookings</h3>
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 sm:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
      {cancelError && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{cancelError}</p>}
      {payError && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{payError}</p>}
      {notProvidedError && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{notProvidedError}</p>}
      {deleteError && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{deleteError}</p>}
      {reviewError && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{reviewError}</p>}
      <div className="space-y-4">
        {recentBookings.map((booking) => {
          const serviceVisual = getServiceVisual(booking.service);
          const ServiceIcon = serviceVisual.icon;
          return (
          <div key={booking.id} className="border p-4 sm:p-6 rounded-lg bg-white/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex w-full min-w-0 items-center space-x-3 sm:space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${serviceVisual.containerClass}`}>
                  <ServiceIcon className={`w-6 h-6 ${serviceVisual.iconClass}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-gray-900">{booking.service}</h4>
                    <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium sm:hidden ${getStatusColor(booking.status)}`}>
                      {formatStatusLabel(booking.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">with {booking.provider}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {booking.date} at {booking.time}
                  </p>
                  <p className="text-sm font-semibold text-blue-700 mt-1">Amount: INR {Number(booking.amount || 0).toLocaleString("en-IN")}</p>
                  {booking.showWorkerDetails && booking.workerPhone && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{booking.workerPhone}</span>
                    </p>
                  )}
                  {booking.showWorkerDetails && booking.workerEmail && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{booking.workerEmail}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="w-full sm:w-auto text-left sm:text-right">
                {booking.rating && <div className="mt-2 flex items-center sm:hidden">{renderStars(booking.rating)}</div>}
                {(trackEligibleStatuses.has(booking.status) || chatEligibleStatuses.has(booking.status)) && booking.workerId && (
                  <div className="mt-2 flex justify-between gap-2 sm:hidden w-full">
                    {trackEligibleStatuses.has(booking.status) && (
                      <button
                        type="button"
                        onClick={() => setTrackingBooking(booking)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 whitespace-nowrap"
                      >
                        <Navigation className="h-3.5 w-3.5 flex-shrink-0" />
                        Track Worker
                      </button>
                    )}
                    {chatEligibleStatuses.has(booking.status) && (
                      <button
                        type="button"
                        onClick={() => setChatBooking(booking)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Chat
                      </button>
                    )}
                  </div>
                )}
                <div
                  className={`mt-2 flex items-center sm:hidden ${reviewEligibleStatuses.has(booking.status) ? "justify-between" : "justify-end"}`}
                >
                  {reviewEligibleStatuses.has(booking.status) && (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenReviewByBookingId((prev) => ({
                          ...prev,
                          [booking.id]: !prev[booking.id]
                        }))
                      }
                      className="inline-flex h-8 items-center text-xs font-semibold text-blue-600 hover:underline"
                    >
                      {booking.rating || booking.feedback ? "Edit Feedback" : "Give Feedback"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteBooking?.(booking.id)}
                    disabled={
                      cancelLoadingBookingId === booking.id ||
                      payLoadingBookingId === booking.id ||
                      reviewLoadingBookingId === booking.id ||
                      deleteLoadingBookingId === booking.id
                    }
                    aria-label="Delete booking"
                    className="-translate-y-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-70"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-2">
                  <button
                    type="button"
                    onClick={() => onDeleteBooking?.(booking.id)}
                    disabled={
                      cancelLoadingBookingId === booking.id ||
                      payLoadingBookingId === booking.id ||
                      reviewLoadingBookingId === booking.id ||
                      deleteLoadingBookingId === booking.id
                    }
                    aria-label="Delete booking"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-70"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}>
                    {formatStatusLabel(booking.status)}
                  </span>
                  {trackEligibleStatuses.has(booking.status) && booking.workerId && (
                    <button
                      type="button"
                      onClick={() => setTrackingBooking(booking)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 whitespace-nowrap"
                    >
                      <Navigation className="h-3.5 w-3.5 flex-shrink-0" />
                      Track Worker
                    </button>
                  )}
                  {chatEligibleStatuses.has(booking.status) && booking.workerId && (
                    <button
                      type="button"
                      onClick={() => setChatBooking(booking)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Chat
                    </button>
                  )}
                  {booking.rating && <div className="flex items-center">{renderStars(booking.rating)}</div>}
                  {reviewEligibleStatuses.has(booking.status) && (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenReviewByBookingId((prev) => ({
                          ...prev,
                          [booking.id]: !prev[booking.id]
                        }))
                      }
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      {booking.rating || booking.feedback ? "Edit Feedback" : "Give Feedback"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {cancelEligibleStatuses.has(booking.status) && (
              <div className="mt-4 border-t pt-4">
                {canCancelBooking(booking) ? (
                  <div className="space-y-3">
                    <p className="text-sm text-amber-700 flex items-center gap-1">
                      <Clock3 className="w-4 h-4" />
                      Cancel window: {formatRemainingMs(getRemainingMs(booking))}
                    </p>
                    <button
                      type="button"
                      onClick={() => onCancelBooking?.(booking.id)}
                      disabled={
                        cancelLoadingBookingId === booking.id || payLoadingBookingId === booking.id || deleteLoadingBookingId === booking.id
                      }
                      className="w-full sm:w-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
                    >
                      {cancelLoadingBookingId === booking.id ? "Cancelling..." : "Cancel Booking"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">Cancel option closed after 10 minutes.</p>
                    <div className="flex flex-col sm:flex-row sm:items-stretch gap-3">
                      <button
                        type="button"
                        onClick={() => onPayBooking?.(booking.id)}
                        disabled={
                          cancelLoadingBookingId === booking.id ||
                          payLoadingBookingId === booking.id ||
                          notProvidedLoadingBookingId === booking.id ||
                          deleteLoadingBookingId === booking.id
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 w-full sm:w-auto rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                      >
                        <CreditCard className="w-4 h-4" />
                        {payLoadingBookingId === booking.id ? "Processing..." : "Pay Now"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onMarkServiceNotProvided?.(booking.id)}
                        disabled={
                          cancelLoadingBookingId === booking.id ||
                          payLoadingBookingId === booking.id ||
                          notProvidedLoadingBookingId === booking.id ||
                          deleteLoadingBookingId === booking.id
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 w-full sm:w-auto rounded-lg bg-amber-600 px-5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-70"
                      >
                        <Wrench className="w-4 h-4" />
                        {notProvidedLoadingBookingId === booking.id ? "Updating..." : "Service Not Provided"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {reviewEligibleStatuses.has(booking.status) && openReviewByBookingId[booking.id] && (
              <div className="mt-4 border-t pt-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900">Rate & Feedback</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setReviewDrafts((prev) => ({
                          ...prev,
                          [booking.id]: {
                            ...(prev[booking.id] || { rating: 0, feedback: "" }),
                            rating: value
                          }
                        }))
                      }
                      className={`rounded-md px-2 py-1 text-sm font-semibold ${
                        (reviewDrafts[booking.id]?.rating || 0) >= value ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={reviewDrafts[booking.id]?.feedback || ""}
                  onChange={(event) =>
                    setReviewDrafts((prev) => ({
                      ...prev,
                      [booking.id]: {
                        ...(prev[booking.id] || { rating: 0, feedback: "" }),
                        feedback: event.target.value
                      }
                    }))
                  }
                  placeholder="Write your feedback message..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const success = await onSubmitReview?.(booking.id, {
                      rating: reviewDrafts[booking.id]?.rating || 0,
                      feedback: reviewDrafts[booking.id]?.feedback || ""
                    });
                    if (success) {
                      setOpenReviewByBookingId((prev) => ({
                        ...prev,
                        [booking.id]: false
                      }));
                    }
                  }}
                  disabled={
                    reviewLoadingBookingId === booking.id ||
                    Number(reviewDrafts[booking.id]?.rating || 0) < 1 ||
                    !String(reviewDrafts[booking.id]?.feedback || "").trim()
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  {reviewLoadingBookingId === booking.id ? "Saving..." : booking.rating ? "Update Review" : "Submit Review"}
                </button>
              </div>
            )}
          </div>
        );
        })}
        {recentBookings.length === 0 && <p className="text-sm text-gray-500">No bookings found for this account.</p>}
      </div>
    </div>

    <ChatModal
      open={chatBooking != null}
      onClose={() => setChatBooking(null)}
      bookingId={chatBooking?.id}
      senderName={userName}
      senderRole="customer"
      counterpartName={chatBooking?.provider}
      authToken={authToken}
      bookingStatus={chatBooking?.status}
    />
    <LiveTrackingModal
      open={trackingBooking != null}
      onClose={() => setTrackingBooking(null)}
      booking={trackingBooking}
      authToken={authToken}
    />
    </>
  );
}

export default CustomerBookingsPage;
