import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Car,
  Clock3,
  CreditCard,
  Droplets,
  Home,
  ImagePlus,
  Mail,
  MessageCircle,
  Navigation,
  Paintbrush,
  Phone,
  Scissors,
  Trash2,
  Video,
  Wind,
  Wrench,
  X,
  Zap
} from "lucide-react";
import LiveTrackingModal from "../../components/LiveTrackingModal";
import ChatModal from "@shared/components/ChatModal";
import { clearChatbotPendingAction, readChatbotPendingAction } from "@shared/components/chatbot/sessionStorage";

const CANCEL_WINDOW_MS = 10 * 60 * 1000;
const REVIEW_MEDIA_MAX_ITEMS = 4;
const REVIEW_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const REVIEW_VIDEO_MAX_BYTES = 8 * 1024 * 1024;
const REVIEW_MEDIA_TOTAL_MAX_BYTES = 10 * 1024 * 1024;
const REVIEW_MEDIA_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,video/mp4,video/webm,video/ogg,video/quicktime";
const REVIEW_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const REVIEW_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);

const cancelEligibleStatuses = new Set(["pending", "confirmed", "upcoming"]);
const reviewEligibleStatuses = new Set(["confirmed", "in-progress", "completed", "not-provided"]);
const trackEligibleStatuses = new Set(["confirmed", "in-progress", "upcoming"]);
const chatEligibleStatuses = new Set(["confirmed", "in-progress", "upcoming"]);

function findEligibleBooking(bookings, requestedBookingId, eligibleStatuses) {
  const requestedId = String(requestedBookingId || "").trim();
  const normalizedBookings = Array.isArray(bookings) ? bookings : [];

  if (requestedId) {
    const exactMatch = normalizedBookings.find((booking) => {
      const bookingId = String(booking?.id || booking?._id || "").trim();
      const status = String(booking?.status || "").toLowerCase();
      return bookingId === requestedId && eligibleStatuses.has(status);
    });
    if (exactMatch) return exactMatch;
  }

  return (
    normalizedBookings.find((booking) => eligibleStatuses.has(String(booking?.status || "").toLowerCase())) || null
  );
}

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

function estimateBase64BytesFromDataUrl(dataUrl) {
  const value = String(dataUrl || "");
  const base64Part = value.split(",")[1] || "";
  const normalized = base64Part.replace(/\s+/g, "");
  if (!normalized) {
    return 0;
  }
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function normalizeFeedbackMediaItems(mediaItems) {
  if (!Array.isArray(mediaItems)) {
    return [];
  }

  return mediaItems
    .map((media) => {
      const dataUrl = String(media?.dataUrl || "").trim();
      if (!dataUrl) {
        return null;
      }
      const mimeType = String(media?.mimeType || "").trim();
      const kind = media?.kind === "video" ? "video" : "image";
      return {
        kind,
        mimeType,
        dataUrl,
        rawBytes: estimateBase64BytesFromDataUrl(dataUrl)
      };
    })
    .filter(Boolean);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read selected file."));
    reader.readAsDataURL(file);
  });
}

function createDraftFromBooking(booking) {
  return {
    rating: booking?.rating || 0,
    feedback: booking?.feedback || "",
    feedbackMedia: normalizeFeedbackMediaItems(booking?.feedbackMedia)
  };
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
  const [nowTs, setNowTs] = useState(Date.now());
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [openReviewByBookingId, setOpenReviewByBookingId] = useState({});
  const [reviewMediaErrors, setReviewMediaErrors] = useState({});

  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  useEffect(() => {
    const timerId = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    const pendingAction = readChatbotPendingAction();
    if (pendingAction?.type !== "customer_bookings_action") return;

    if (!Array.isArray(recentBookings) || recentBookings.length === 0) {
      return;
    }

    const payload = pendingAction.payload || {};
    const actionType = String(payload.action || "").toLowerCase();
    const requestedBookingId = String(payload.bookingId || "").trim();

    clearChatbotPendingAction();

    if (actionType === "open_tracking") {
      const targetBooking = findEligibleBooking(recentBookings, requestedBookingId, trackEligibleStatuses);
      if (!targetBooking) return;
      setChatBooking(null);
      setTrackingBooking(targetBooking);
      return;
    }

    if (actionType === "open_chat") {
      const targetBooking = findEligibleBooking(recentBookings, requestedBookingId, chatEligibleStatuses);
      if (!targetBooking) return;
      setTrackingBooking(null);
      setChatBooking(targetBooking);
    }
  }, [recentBookings]);

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
        next[booking.id] = createDraftFromBooking(booking);
      });
      return next;
    });
  }, [recentBookings]);

  const handleToggleReviewEditor = (booking) => {
    const bookingId = booking?.id;
    if (!bookingId) {
      return;
    }

    const isOpen = Boolean(openReviewByBookingId[bookingId]);
    if (!isOpen) {
      setReviewDrafts((prev) => ({
        ...prev,
        [bookingId]: createDraftFromBooking(booking)
      }));
      setReviewMediaErrors((prev) => ({
        ...prev,
        [bookingId]: ""
      }));
    }

    setOpenReviewByBookingId((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId]
    }));
  };

  const handleReviewMediaSelection = async (bookingId, files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) {
      return;
    }

    const currentMedia = normalizeFeedbackMediaItems(reviewDrafts[bookingId]?.feedbackMedia);
    const nextMedia = [...currentMedia];
    const errors = [];
    let totalBytes = nextMedia.reduce((sum, media) => sum + Number(media.rawBytes || 0), 0);

    for (const file of selectedFiles) {
      if (nextMedia.length >= REVIEW_MEDIA_MAX_ITEMS) {
        errors.push(`You can upload up to ${REVIEW_MEDIA_MAX_ITEMS} files in one review.`);
        break;
      }

      const mimeType = String(file?.type || "").trim().toLowerCase();
      const isImage = REVIEW_IMAGE_TYPES.has(mimeType);
      const isVideo = REVIEW_VIDEO_TYPES.has(mimeType);
      if (!isImage && !isVideo) {
        errors.push(`"${file.name}" type is not supported.`);
        continue;
      }

      const maxBytes = isImage ? REVIEW_IMAGE_MAX_BYTES : REVIEW_VIDEO_MAX_BYTES;
      if (Number(file.size || 0) > maxBytes) {
        errors.push(isImage ? `"${file.name}" must be 3MB or less.` : `"${file.name}" must be 8MB or less.`);
        continue;
      }

      if (totalBytes + file.size > REVIEW_MEDIA_TOTAL_MAX_BYTES) {
        errors.push("Total media size must be 10MB or less.");
        break;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        nextMedia.push({
          kind: isVideo ? "video" : "image",
          mimeType,
          dataUrl,
          rawBytes: Number(file.size || 0)
        });
        totalBytes += Number(file.size || 0);
      } catch (_error) {
        errors.push(`"${file.name}" could not be read.`);
      }
    }

    setReviewDrafts((prev) => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] || { rating: 0, feedback: "", feedbackMedia: [] }),
        feedbackMedia: nextMedia
      }
    }));

    setReviewMediaErrors((prev) => ({
      ...prev,
      [bookingId]: errors[0] || ""
    }));
  };

  const handleRemoveReviewMedia = (bookingId, indexToRemove) => {
    setReviewDrafts((prev) => {
      const current = normalizeFeedbackMediaItems(prev[bookingId]?.feedbackMedia);
      return {
        ...prev,
        [bookingId]: {
          ...(prev[bookingId] || { rating: 0, feedback: "", feedbackMedia: [] }),
          feedbackMedia: current.filter((_, index) => index !== indexToRemove)
        }
      };
    });
    setReviewMediaErrors((prev) => ({
      ...prev,
      [bookingId]: ""
    }));
  };

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
            const hasExistingReview = Boolean(
              Number(booking.rating || 0) > 0 ||
                String(booking.feedback || "").trim() ||
                (Array.isArray(booking.feedbackMedia) && booking.feedbackMedia.length)
            );

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

                    <div className={`mt-2 flex items-center sm:hidden ${reviewEligibleStatuses.has(booking.status) ? "justify-between" : "justify-end"}`}>
                      {reviewEligibleStatuses.has(booking.status) && (
                        <button
                          type="button"
                          onClick={() => handleToggleReviewEditor(booking)}
                          className="inline-flex h-8 items-center text-xs font-semibold text-blue-600 hover:underline"
                        >
                          {hasExistingReview ? "Edit Feedback" : "Give Feedback"}
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
                          onClick={() => handleToggleReviewEditor(booking)}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          {hasExistingReview ? "Edit Feedback" : "Give Feedback"}
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
                          disabled={cancelLoadingBookingId === booking.id || payLoadingBookingId === booking.id || deleteLoadingBookingId === booking.id}
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
                    <p className="text-sm font-semibold text-gray-900">Rate and Feedback</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setReviewDrafts((prev) => ({
                              ...prev,
                              [booking.id]: {
                                ...(prev[booking.id] || { rating: 0, feedback: "", feedbackMedia: [] }),
                                rating: value
                              }
                            }))
                          }
                          className={`rounded-md px-2 py-1 text-sm font-semibold ${(reviewDrafts[booking.id]?.rating || 0) >= value ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-500"}`}
                        >
                          *
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
                            ...(prev[booking.id] || { rating: 0, feedback: "", feedbackMedia: [] }),
                            feedback: event.target.value
                          }
                        }))
                      }
                      placeholder="Write your feedback message..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Add Photo Or Video
                        {Array.isArray(reviewDrafts[booking.id]?.feedbackMedia) && reviewDrafts[booking.id].feedbackMedia.length > 0
                          ? ` (${reviewDrafts[booking.id].feedbackMedia.length} uploaded)`
                          : ""}
                      </label>
                      <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700">
                        <ImagePlus className="h-4 w-4" />
                        Upload Media
                        <input
                          type="file"
                          accept={REVIEW_MEDIA_ACCEPT}
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            const pickedFiles = event.target.files ? Array.from(event.target.files) : [];
                            event.target.value = "";
                            handleReviewMediaSelection(booking.id, pickedFiles);
                          }}
                        />
                      </label>
                      <p className="text-xs text-gray-500">Up to 4 files. Image max 3MB each, video max 8MB each, total media max 10MB.</p>
                      {reviewMediaErrors[booking.id] && <p className="text-xs font-medium text-red-600">{reviewMediaErrors[booking.id]}</p>}

                      {Array.isArray(reviewDrafts[booking.id]?.feedbackMedia) && reviewDrafts[booking.id].feedbackMedia.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {reviewDrafts[booking.id].feedbackMedia.map((media, mediaIndex) => (
                            <div key={`${booking.id}-media-${mediaIndex}`} className="relative overflow-hidden rounded-lg border border-gray-200 bg-black/5">
                              {media.kind === "video" ? (
                                <>
                                  <video src={media.dataUrl} controls preload="metadata" className="h-24 w-full bg-black object-cover" />
                                  <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                    <Video className="h-3 w-3" />
                                    Video
                                  </span>
                                </>
                              ) : (
                                <img src={media.dataUrl} alt="Review media preview" className="h-24 w-full object-cover" />
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveReviewMedia(booking.id, mediaIndex)}
                                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                                aria-label="Remove media"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        const success = await onSubmitReview?.(booking.id, {
                          rating: reviewDrafts[booking.id]?.rating || 0,
                          feedback: reviewDrafts[booking.id]?.feedback || "",
                          feedbackMedia: normalizeFeedbackMediaItems(reviewDrafts[booking.id]?.feedbackMedia).map((media) => ({
                            kind: media.kind,
                            mimeType: media.mimeType,
                            dataUrl: media.dataUrl
                          }))
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
                        (!String(reviewDrafts[booking.id]?.feedback || "").trim() &&
                          !normalizeFeedbackMediaItems(reviewDrafts[booking.id]?.feedbackMedia).length)
                      }
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                    >
                      {reviewLoadingBookingId === booking.id ? "Saving..." : hasExistingReview ? "Update Review" : "Submit Review"}
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
