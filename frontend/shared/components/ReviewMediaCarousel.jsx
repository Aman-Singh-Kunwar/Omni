import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Video } from "lucide-react";

function normalizeMediaItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((media) => {
      const dataUrl = String(media?.dataUrl || "").trim();
      if (!dataUrl) {
        return null;
      }
      return {
        kind: media?.kind === "video" ? "video" : "image",
        mimeType: String(media?.mimeType || "").trim(),
        dataUrl
      };
    })
    .filter(Boolean);
}

function ReviewMediaCarousel({ items = [], className = "", compact = false, mediaFit = "contain" }) {
  const mediaItems = useMemo(() => normalizeMediaItems(items), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const mediaHeightClass = compact ? "h-40 sm:h-44" : "h-56 sm:h-64";
  const thumbSizeClass = compact ? "h-11 w-11" : "h-14 w-14";
  const mediaObjectClass = mediaFit === "cover" ? "object-cover" : "object-contain";

  useEffect(() => {
    setActiveIndex((prev) => (prev >= mediaItems.length ? 0 : prev));
  }, [mediaItems.length]);

  if (!mediaItems.length) {
    return null;
  }

  const currentItem = mediaItems[activeIndex] || mediaItems[0];
  const canNavigate = mediaItems.length > 1;

  return (
    <div className={`rounded-xl border border-gray-200 bg-gray-50 p-2 ${className}`.trim()}>
      <div className="relative overflow-hidden rounded-lg bg-slate-900">
        {currentItem.kind === "video" ? (
          <video src={currentItem.dataUrl} controls preload="metadata" className={`${mediaHeightClass} w-full ${mediaObjectClass}`} />
        ) : (
          <img src={currentItem.dataUrl} alt="Review media" className={`${mediaHeightClass} w-full ${mediaObjectClass}`} />
        )}

        {currentItem.kind === "video" && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white">
            <Video className="h-3.5 w-3.5" />
            Video
          </span>
        )}

        {canNavigate && (
          <>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
              aria-label="Previous media"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev + 1) % mediaItems.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
              aria-label="Next media"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {canNavigate && (
        <div className="mt-2 flex flex-wrap gap-2">
          {mediaItems.map((media, index) => (
            <button
              key={`${media.kind}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`${thumbSizeClass} overflow-hidden rounded-md border ${
                index === activeIndex ? "border-blue-500 ring-1 ring-blue-300" : "border-gray-300"
              }`}
              aria-label={`Show review media ${index + 1}`}
            >
              {media.kind === "video" ? (
                <video src={media.dataUrl} preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <img src={media.dataUrl} alt={`Review media ${index + 1}`} className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewMediaCarousel;
