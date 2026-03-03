import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, MessageSquareText, Star } from "lucide-react";

function renderStars(rating) {
  const safeRating = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      className={`h-4 w-4 ${index < safeRating ? "fill-current text-amber-400" : "text-gray-300"}`}
    />
  ));
}

function formatReviewDateTime(dateValue, timeValue) {
  const date = String(dateValue || "").trim();
  const time = String(timeValue || "").trim();
  if (!date && !time) {
    return "Date not available";
  }
  return [date, time ? `at ${time}` : ""].filter(Boolean).join(" ");
}

function getCustomerInitial(name) {
  const safeName = String(name || "").trim();
  return safeName ? safeName[0].toUpperCase() : "C";
}

function normalizeReviewMedia(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((media) => ({
      kind: media?.kind === "video" ? "video" : "image",
      dataUrl: String(media?.dataUrl || "").trim()
    }))
    .filter((media) => media.dataUrl);
}

function WorkerReviewsPage({ reviews = [] }) {
  const navigate = useNavigate();
  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };
  const submittedReviews = reviews.filter((review) => {
    const rating = Number(review.rating || 0);
    const feedback = String(review.feedback || "").trim();
    const feedbackMedia = Array.isArray(review.feedbackMedia) ? review.feedbackMedia : [];
    return rating > 0 || feedback.length > 0 || feedbackMedia.length > 0;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white/80 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold text-gray-900">Customer Reviews</h3>
          <button
            type="button"
            onClick={handleBackClick}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 sm:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600">Feedback submitted by customers for completed or not-provided bookings.</p>
      </div>

      <div className="space-y-4">
        {submittedReviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-gray-200/90 bg-white/90 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                    {getCustomerInitial(review.customer)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-gray-900">{review.customer}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatReviewDateTime(review.date, review.time)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  Service: <span className="ml-1 font-semibold text-gray-900">{review.service || "N/A"}</span>
                </div>
              </div>
              <div className="md:text-right">
                <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1">
                  {renderStars(review.rating)}
                </div>
                <p className="mt-1 text-xs font-medium text-gray-600">{Number(review.rating || 0).toFixed(1)} / 5</p>
              </div>
            </div>

            {String(review.feedback || "").trim() && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                <div className="mb-1 flex items-center gap-2 text-gray-700">
                  <MessageSquareText className="h-4 w-4" />
                  <span className="text-sm font-semibold">Feedback</span>
                </div>
                <p className="text-sm leading-6 text-gray-700">{review.feedback}</p>
              </div>
            )}

            {Array.isArray(review.feedbackMedia) && review.feedbackMedia.length > 0 && (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-600">
                  Customer Uploaded Photos/Videos
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {normalizeReviewMedia(review.feedbackMedia).map((media, index) => (
                    <div key={`${review.id}-media-${index}`} className="overflow-hidden rounded-lg border border-gray-200 bg-slate-900 aspect-[4/3]">
                      {media.kind === "video" ? (
                        <video src={media.dataUrl} controls preload="metadata" className="h-full w-full object-cover" />
                      ) : (
                        <img src={media.dataUrl} alt={`Review media ${index + 1}`} className="h-full w-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}

        {submittedReviews.length === 0 && (
          <div className="rounded-xl border bg-white/80 p-6 text-sm text-gray-500 shadow-sm">
            No reviews submitted yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkerReviewsPage;
