import React from "react";
import { MessageSquareText, Star } from "lucide-react";

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      className={`h-4 w-4 ${index < rating ? "fill-current text-yellow-400" : "text-gray-300"}`}
    />
  ));
}

function WorkerReviewsPage({ reviews = [] }) {
  const submittedReviews = reviews.filter((review) => {
    const rating = Number(review.rating || 0);
    const feedback = String(review.feedback || "").trim();
    return rating > 0 || feedback.length > 0;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white/80 p-6 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900">Customer Reviews</h3>
        <p className="mt-1 text-sm text-gray-600">Feedback submitted by customers for completed or not-provided bookings.</p>
      </div>

      <div className="space-y-4">
        {submittedReviews.map((review) => (
          <div key={review.id} className="rounded-xl border bg-white/80 p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{review.customer}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {review.date} {review.time ? `at ${review.time}` : ""}
                </p>
              </div>
              <div className="sm:text-right">
                <div className="flex items-center gap-1 sm:justify-end">{renderStars(Number(review.rating || 0))}</div>
                <p className="mt-1 text-xs text-gray-600">
                  Service provided: <span className="font-semibold text-gray-800">{review.service || "N/A"}</span>
                </p>
              </div>
            </div>

            {String(review.feedback || "").trim() && (
              <div className="mt-4 rounded-lg border bg-gray-50 p-3">
                <div className="mb-1 flex items-center gap-2 text-gray-700">
                  <MessageSquareText className="h-4 w-4" />
                  <span className="text-sm font-semibold">Feedback</span>
                </div>
                <p className="text-sm text-gray-700">{review.feedback}</p>
              </div>
            )}
          </div>
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
