import React, { useEffect, useState } from "react";
import { Clock3, CreditCard, Mail, Phone, Trash2, Wrench } from "lucide-react";

const CANCEL_WINDOW_MS = 10 * 60 * 1000;
const cancelEligibleStatuses = new Set(["pending", "confirmed", "upcoming"]);
const reviewEligibleStatuses = new Set(["confirmed", "in-progress", "completed", "not-provided"]);

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
  reviewError = ""
}) {
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
    <div className="bg-white/80 p-6 sm:p-8 rounded-xl shadow-sm border">
      <h3 className="text-xl font-bold text-gray-900 mb-6">My Bookings</h3>
      {cancelError && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{cancelError}</p>}
      {payError && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{payError}</p>}
      {notProvidedError && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{notProvidedError}</p>}
      {deleteError && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{deleteError}</p>}
      {reviewError && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{reviewError}</p>}
      <div className="space-y-4">
        {recentBookings.map((booking) => (
          <div key={booking.id} className="border p-4 sm:p-6 rounded-lg bg-white/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex w-full min-w-0 items-center space-x-3 sm:space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Wrench className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{booking.service}</h4>
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
              <div className="text-left sm:text-right w-full sm:w-auto">
                <div className="mb-2 flex justify-start sm:justify-end">
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
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {formatStatusLabel(booking.status)}
                </span>
                {booking.rating && <div className="flex items-center mt-2 justify-start sm:justify-end">{renderStars(booking.rating)}</div>}
                {reviewEligibleStatuses.has(booking.status) && (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenReviewByBookingId((prev) => ({
                        ...prev,
                        [booking.id]: !prev[booking.id]
                      }))
                    }
                    className="mt-2 block text-xs font-semibold text-blue-600 hover:underline sm:ml-auto"
                  >
                    {booking.rating || booking.feedback ? "Edit Feedback" : "Give Feedback"}
                  </button>
                )}
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
        ))}
        {recentBookings.length === 0 && <p className="text-sm text-gray-500">No bookings found for this account.</p>}
      </div>
    </div>
  );
}

export default CustomerBookingsPage;
