import React from "react";
import { Star } from "lucide-react";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBreakdown(ratingBreakdown = {}) {
  return {
    5: Math.max(0, toNumber(ratingBreakdown?.[5])),
    4: Math.max(0, toNumber(ratingBreakdown?.[4])),
    3: Math.max(0, toNumber(ratingBreakdown?.[3])),
    2: Math.max(0, toNumber(ratingBreakdown?.[2])),
    1: Math.max(0, toNumber(ratingBreakdown?.[1]))
  };
}

function renderStars(rating) {
  const safeRating = Math.max(0, Math.min(5, toNumber(rating)));
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={`summary-star-${index}`}
      className={`h-4 w-4 ${index < Math.round(safeRating) ? "fill-amber-500 text-amber-500" : "text-amber-300"}`}
    />
  ));
}

function ReviewRatingSummary({ averageRating = 0, ratingBreakdown = {}, reviewCount = 0, className = "" }) {
  const normalizedBreakdown = normalizeBreakdown(ratingBreakdown);
  const stars = [5, 4, 3, 2, 1];
  const countedRatings = stars.reduce((sum, star) => sum + normalizedBreakdown[star], 0);
  const fallbackTotal = Math.max(0, toNumber(reviewCount));
  const totalRatings = countedRatings > 0 ? countedRatings : fallbackTotal;

  return (
    <div className={`rounded-xl border border-gray-200 bg-gray-50/60 p-4 ${className}`.trim()}>
      <h4 className="text-base font-semibold text-gray-900">Customer reviews</h4>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex items-center gap-0.5">{renderStars(averageRating)}</div>
        <span className="text-lg font-semibold text-gray-900">{toNumber(averageRating).toFixed(1)}</span>
        <span className="text-sm text-gray-700">out of 5</span>
      </div>
      <p className="mt-1 text-sm text-gray-600">{Number(totalRatings || 0).toLocaleString("en-IN")} ratings</p>

      <div className="mt-3 space-y-2.5">
        {stars.map((star) => {
          const count = normalizedBreakdown[star];
          const percent = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
          return (
            <div key={`rating-row-${star}`} className="grid grid-cols-[44px_1fr_42px] items-center gap-2.5">
              <span className="text-sm font-medium text-gray-700">{star} star</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-sm font-medium text-gray-700">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReviewRatingSummary;
