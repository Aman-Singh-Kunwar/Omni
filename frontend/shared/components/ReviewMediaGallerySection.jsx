import React, { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Video } from "lucide-react";

function normalizeMediaFromReviews(reviews = []) {
  if (!Array.isArray(reviews)) {
    return [];
  }

  const items = [];
  reviews.forEach((review) => {
    const mediaList = Array.isArray(review?.feedbackMedia) ? review.feedbackMedia : [];
    mediaList.forEach((media, index) => {
      const dataUrl = String(media?.dataUrl || "").trim();
      if (!dataUrl) {
        return;
      }
      items.push({
        id: `${String(review?.id || "review")}-${index}`,
        kind: media?.kind === "video" ? "video" : "image",
        dataUrl,
        customerName: String(review?.customerName || "Customer")
      });
    });
  });
  return items;
}

function ReviewMediaGallerySection({ reviews = [], className = "" }) {
  const mediaItems = useMemo(() => normalizeMediaFromReviews(reviews), [reviews]);
  const scrollerRef = useRef(null);

  if (!mediaItems.length) {
    return null;
  }

  const scrollByAmount = (amount) => {
    if (!scrollerRef.current) {
      return;
    }
    scrollerRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const scrollToEnd = () => {
    if (!scrollerRef.current) {
      return;
    }
    scrollerRef.current.scrollTo({ left: scrollerRef.current.scrollWidth, behavior: "smooth" });
  };

  return (
    <section className={`rounded-xl border border-gray-200 bg-white p-4 ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-base font-semibold text-gray-900">Reviews with images</h4>
        <button
          type="button"
          onClick={scrollToEnd}
          className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
        >
          See all photos
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollByAmount(-320)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          aria-label="Scroll media left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div ref={scrollerRef} className="flex-1 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-3 pr-1">
            {mediaItems.map((item) => (
              <div key={item.id} className="relative h-28 w-44 overflow-hidden rounded-lg border border-gray-200 bg-black/5 sm:h-32 sm:w-52">
                {item.kind === "video" ? (
                  <>
                    <video src={item.dataUrl} preload="metadata" muted className="h-full w-full object-cover" />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      <Video className="h-3 w-3" />
                      Video
                    </span>
                  </>
                ) : (
                  <img src={item.dataUrl} alt={`Review media from ${item.customerName}`} className="h-full w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => scrollByAmount(320)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          aria-label="Scroll media right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

export default ReviewMediaGallerySection;
