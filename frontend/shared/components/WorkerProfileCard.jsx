import React, { useState, useMemo } from "react";
import {
  Star,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Phone,
  Mail,
  Share2,
  Bookmark,
} from "lucide-react";

/**
 * WorkerProfileCard - Reusable worker discovery/profile card with:
 * - Profile image with online/offline status badge
 * - Name, service category, rating summary
 * - Average hourly rate and response time
 * - Completion rate and cancellation rate badges
 * - Quick action buttons (call, message, book)
 * - Verified skills badge
 * - Service count and booking count
 * - Recent review snippet
 * - Add to favorites / Share profile
 * - Badges: Verified, Top Rated, Rising Star
 */

const BADGE_CLASSES = {
  verified: "bg-emerald-100 text-emerald-700 border-emerald-300",
  topRated: "bg-amber-100 text-amber-700 border-amber-300",
  risingstar: "bg-blue-100 text-blue-700 border-blue-300",
  responsive: "bg-green-100 text-green-700 border-green-300",
};

function WorkerProfileCard({
  worker = {},
  onQuickBook = () => {},
  onMessage = () => {},
  onCall = () => {},
  onToggleFavorite = () => {},
  onShare = () => {},
  isFavorited = false,
  isOnline = false,
}) {
  const [showMore, setShowMore] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calculate badges
  const badges = useMemo(() => {
    const b = [];
    if (worker.isVerified) b.push("verified");
    if (worker.avgRating >= 4.7) b.push("topRated");
    if (worker.completionRate > 95 && worker.recentBookings > 10)
      b.push("risingstar");
    return b;
  }, [worker]);

  // Format completion and cancellation rates
  const completionRate = worker.completionRate || 95;
  const cancellationRate = worker.cancellationRate || 2;

  // Get service category color
  const getCategoryColor = (category = "") => {
    const colors = {
      cleaning: "bg-blue-50 border-blue-200 text-blue-700",
      plumbing: "bg-green-50 border-green-200 text-green-700",
      electrical: "bg-amber-50 border-amber-200 text-amber-700",
      carpentry: "bg-orange-50 border-orange-200 text-orange-700",
      default: "bg-gray-50 border-gray-200 text-gray-700",
    };
    return colors[category?.toLowerCase()] || colors.default;
  };

  // Get response time color
  const getResponseTimeColor = (minutes = 0) => {
    if (minutes <= 5) return "text-green-600";
    if (minutes <= 15) return "text-amber-600";
    return "text-gray-600";
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header with image and status */}
      <div className="relative">
        <img
          src={worker.photoUrl || "/api/placeholder/400/250"}
          alt={worker.name}
          className="w-full h-48 object-cover"
        />
        {/* Online/Offline Badge */}
        <div className="absolute top-3 right-3">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isOnline
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-green-600" : "bg-gray-400"
              }`}
            />
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>

        {/* Favorite button */}
        <button
          type="button"
          onClick={() => onToggleFavorite(worker.id)}
          className="absolute top-3 left-3 p-2 rounded-full bg-white/90 hover:bg-white text-gray-600 hover:text-red-600 transition-colors shadow-sm"
          title={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Bookmark
            className="h-5 w-5"
            fill={isFavorited ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Name and category */}
        <div>
          <h3 className="text-lg font-bold text-gray-900">{worker.name || "Worker"}</h3>
          <p
            className={`text-xs font-semibold mt-1 px-2 py-1 rounded-full w-fit border ${getCategoryColor(
              worker.serviceCategory
            )}`}
          >
            {worker.serviceCategory || "Services"}
          </p>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <div
                key={badge}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${
                  BADGE_CLASSES[badge]
                }`}
              >
                <CheckCircle className="h-3 w-3" />
                {badge === "verified"
                  ? "Verified"
                  : badge === "topRated"
                    ? "Top Rated"
                    : "Rising Star"}
              </div>
            ))}
          </div>
        )}

        {/* Rating and price */}
        <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-lg p-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-gray-900">
                {worker.avgRating || 4.8}
              </span>
            </div>
            <p className="text-[10px] text-gray-600">
              {worker.reviewCount || 48} reviews
            </p>
          </div>
          <div className="text-center border-l border-r border-gray-200">
            <p className="font-bold text-gray-900">
              ₹{worker.avgRate || 500}
              <span className="text-xs text-gray-600">/hr</span>
            </p>
            <p className="text-[10px] text-gray-600">Hourly</p>
          </div>
          <div className="text-center">
            <div className={`font-bold ${getResponseTimeColor(worker.avgResponseTime)}`}>
              {worker.avgResponseTime || 3}m
            </div>
            <p className="text-[10px] text-gray-600">Response</p>
          </div>
        </div>

        {/* Performance metrics */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-gray-600">Completion</p>
              <p className="font-bold text-gray-900">{completionRate}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-gray-600">Cancellations</p>
              <p className="font-bold text-gray-900">{cancellationRate}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-gray-600">Distance</p>
              <p className="font-bold text-gray-900">
                {worker.distance || "2.5"}km
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-gray-600">Services</p>
              <p className="font-bold text-gray-900">
                {worker.servicesCount || 8}
              </p>
            </div>
          </div>
        </div>

        {/* Quick bio / Last review */}
        {showMore || worker.lastReview ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            {worker.lastReview ? (
              <div className="space-y-2">
                <p className="font-semibold text-xs text-gray-900">Recent Review</p>
                <p className="text-xs text-gray-700 line-clamp-2">
                  "{worker.lastReview}"
                </p>
                <div className="flex items-center gap-1 text-[10px] text-gray-600">
                  <div className="flex gap-0.5">
                    {[...Array(worker.lastReviewRating || 5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-3 w-3 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <span>by {worker.lastReviewerName || "Customer"}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-700">{worker.bio || "No bio available"}</p>
            )}
          </div>
        ) : null}

        {/* Show more toggle */}
        {worker.lastReview && (
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 w-full py-1"
          >
            {showMore ? "Show less" : "View more"}
          </button>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={() => onMessage(worker.id)}
            title="Send message"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Message</span>
          </button>
          <button
            type="button"
            onClick={() => onCall(worker.id)}
            title="Call worker"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Call</span>
          </button>
          <button
            type="button"
            onClick={() => onShare(worker.id)}
            title="Share profile"
            className="px-3 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* Book button */}
        <button
          type="button"
          onClick={() => onQuickBook(worker.id)}
          className="w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold text-sm transition-colors"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

export default WorkerProfileCard;
