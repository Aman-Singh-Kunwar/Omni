import React, { useState, useCallback, useMemo } from "react";
import {
  Star,
  Heart,
  MessageCircle,
  Flag,
  Copy,
  Share2,
  X,
  Upload,
  Image,
  Play,
} from "lucide-react";

/**
 * ReviewsPanel - Comprehensive review management with:
 * - Browse existing reviews with star ratings
 * - Filter reviews (all, recent, highest rated, lowest rated)
 * - Photo/video gallery per review
 * - Helpful vote system for reviews
 * - Report review button
 * - Submit new review form
 * - Rating selection with emoji feedback
 * - Text review with character counter
 * - Photo/video upload with preview
 * - Modal review gallery
 * - Responsive grid layout (mobile/tablet/desktop)
 */

const REVIEW_FILTERS = ["All", "Recent", "Highest Rated", "Lowest Rated"];
const RATING_EMOJIS = {
  1: { emoji: "😞", text: "Poor" },
  2: { emoji: "😐", text: "Fair" },
  3: { emoji: "😊", text: "Good" },
  4: { emoji: "😄", text: "Great" },
  5: { emoji: "🤩", text: "Excellent" },
};

function ReviewsPanel({
  reviews = [],
  onSubmitReview = () => {},
  onReportReview = () => {},
  onHelpfulVote = () => {},
  isSubmitting = false,
  submissionStatus = {},
  allowSubmit = true,
  userRole = "customer",
}) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedReviewForGallery, setSelectedReviewForGallery] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [helpful, setHelpful] = useState({});

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    let filtered = [...reviews];

    if (selectedFilter === "Recent") {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (selectedFilter === "Highest Rated") {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (selectedFilter === "Lowest Rated") {
      filtered.sort((a, b) => a.rating - b.rating);
    }

    return filtered;
  }, [reviews, selectedFilter]);

  // Calculate average rating
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return (
      (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(
        1
      )
    );
  }, [reviews]);

  // Rating distribution
  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      dist[r.rating]++;
    });
    return dist;
  }, [reviews]);

  // Handle file upload
  const handleMediaUpload = useCallback((files) => {
    const newMedia = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newMedia.push({
            type: file.type.startsWith("image/") ? "image" : "video",
            url: e.target.result,
            name: file.name,
          });
        };
        reader.readAsDataURL(file);
      }
    });

    setTimeout(() => {
      setUploadedMedia((prev) => [...prev, ...newMedia]);
    }, 100);
  }, []);

  // Handle review submission
  const handleSubmit = useCallback(async () => {
    if (!selectedRating || !reviewText.trim()) {
      return;
    }

    await onSubmitReview?.({
      rating: selectedRating,
      text: reviewText,
      media: uploadedMedia,
    });

    // Reset form on success
    if (!submissionStatus.error) {
      setSelectedRating(0);
      setReviewText("");
      setUploadedMedia([]);
    }
  }, [selectedRating, reviewText, uploadedMedia, onSubmitReview, submissionStatus]);

  // Handle helpful vote
  const handleHelpfulVote = useCallback(
    (reviewId, isHelpful) => {
      setHelpful((prev) => ({
        ...prev,
        [reviewId]: isHelpful,
      }));
      onHelpfulVote?.(reviewId, isHelpful);
    },
    [onHelpfulVote]
  );

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {reviews.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white/80 p-6 space-y-4">
          <div className="flex items-end gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl font-bold text-gray-900">
                  {averageRating}
                </span>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(averageRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">{reviews.length} reviews</p>
            </div>
          </div>

          {/* Rating distribution bars */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 w-6">
                  {rating}★
                </span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{
                      width: `${reviews.length > 0
                        ? (ratingDistribution[rating] / reviews.length) * 100
                        : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-600 w-8 text-right">
                  {ratingDistribution[rating]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Review Form */}
      {allowSubmit && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-4">
          <h3 className="font-semibold text-gray-900">Share Your Experience</h3>

          {/* Rating selection with emojis */}
          <div className="space-y-2">
            <p className="text-sm text-gray-700">How was your experience?</p>
            <div className="flex justify-between gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSelectedRating(rating)}
                  className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg transition-all border-2 ${
                    selectedRating === rating
                      ? "border-blue-600 bg-white"
                      : "border-transparent hover:bg-white/50"
                  }`}
                >
                  <span className="text-2xl mb-1">
                    {RATING_EMOJIS[rating].emoji}
                  </span>
                  <span className="text-xs font-medium text-gray-700">
                    {RATING_EMOJIS[rating].text}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Review text */}
          <label className="block">
            <p className="text-sm text-gray-700 mb-2">
              Your Review (Optional but appreciated!)
            </p>
            <textarea
              rows={3}
              maxLength={500}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share details about your experience..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
            />
            <p className="mt-1 text-xs text-gray-600 text-right">
              {reviewText.length}/500
            </p>
          </label>

          {/* Media upload */}
          <div className="space-y-2">
            <p className="text-sm text-gray-700">Add Photos/Videos (Optional)</p>
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors">
              <Upload className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">Click to upload media</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleMediaUpload(e.target.files)}
                className="hidden"
              />
            </label>

            {/* Uploaded media preview */}
            {uploadedMedia.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {uploadedMedia.map((media, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group"
                  >
                    {media.type === "image" ? (
                      <img
                        src={media.url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <video
                          src={media.url}
                          className="w-full h-full object-cover"
                        />
                        <Play className="absolute inset-1/2 h-6 w-6 text-white -translate-x-1/2 -translate-y-1/2 opacity-70" />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setUploadedMedia((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status messages */}
          {submissionStatus.error && (
            <div className="rounded-lg bg-red-100 border border-red-300 px-3 py-2 text-xs text-red-700">
              {submissionStatus.error}
            </div>
          )}
          {submissionStatus.success && (
            <div className="rounded-lg bg-green-100 border border-green-300 px-3 py-2 text-xs text-green-700">
              {submissionStatus.success}
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              !selectedRating || !reviewText.trim() || isSubmitting
            }
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      {reviews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {REVIEW_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                selectedFilter === filter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      )}

      {/* Reviews list */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No reviews yet</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div
              key={review.id}
              className="rounded-lg border border-gray-200 bg-white/80 p-4 space-y-3"
            >
              {/* Review header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">
                      {review.authorName}
                    </p>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {new Date(review.date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onReportReview?.(review.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Report review"
                >
                  <Flag className="h-4 w-4" />
                </button>
              </div>

              {/* Review text */}
              {review.text && (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {review.text}
                </p>
              )}

              {/* Media gallery */}
              {review.media && review.media.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {review.media.map((media, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedReviewForGallery(review);
                        setGalleryIndex(idx);
                      }}
                      className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group hover:ring-2 hover:ring-blue-500 transition-all"
                    >
                      {media.type === "image" ? (
                        <img
                          src={media.url}
                          alt={`Review media ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <>
                          <video
                            src={media.url}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <Play className="absolute inset-1/2 h-6 w-6 text-white -translate-x-1/2 -translate-y-1/2 opacity-70 group-hover:opacity-100" />
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Helpful votes */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => handleHelpfulVote(review.id, true)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    helpful[review.id] === true
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${helpful[review.id] === true ? "fill-current" : ""}`} />
                  Helpful ({review.helpfulCount || 0})
                </button>
                <button
                  type="button"
                  onClick={() => handleHelpfulVote(review.id, false)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    helpful[review.id] === false
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Not Helpful ({review.unhelpfulCount || 0})
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Gallery */}
      {selectedReviewForGallery && selectedReviewForGallery.media && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-w-2xl w-full">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedReviewForGallery(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Media display */}
            {selectedReviewForGallery.media[galleryIndex]?.type === "image" ? (
              <img
                src={
                  selectedReviewForGallery.media[galleryIndex]?.url
                }
                alt="Review media"
                className="w-full rounded-lg"
              />
            ) : (
              <video
                src={
                  selectedReviewForGallery.media[galleryIndex]?.url
                }
                controls
                className="w-full rounded-lg"
              />
            )}

            {/* Navigation */}
            {selectedReviewForGallery.media.length > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  type="button"
                  onClick={() =>
                    setGalleryIndex((prev) =>
                      prev === 0
                        ? selectedReviewForGallery.media.length - 1
                        : prev - 1
                    )
                  }
                  className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100"
                >
                  ← Previous
                </button>
                <p className="text-white text-sm">
                  {galleryIndex + 1} / {selectedReviewForGallery.media.length}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setGalleryIndex((prev) =>
                      prev === selectedReviewForGallery.media.length - 1
                        ? 0
                        : prev + 1
                    )
                  }
                  className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewsPanel;
