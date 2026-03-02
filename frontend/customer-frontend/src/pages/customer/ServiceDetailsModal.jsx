import React, { useEffect, useMemo, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, ShieldCheck, UserCheck, X } from "lucide-react";

function ServiceDetailsModal({ service, onClose, onSchedule }) {
  const gallery = useMemo(() => {
    if (!service) {
      return [];
    }

    const images = Array.isArray(service.gallery) ? service.gallery.filter(Boolean) : [];
    if (images.length) {
      return images;
    }

    return service.image ? [service.image] : [];
  }, [service]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [service]);

  useEffect(() => {
    if (!service) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, service]);

  useEffect(() => {
    if (!service) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [service]);

  if (!service) {
    return null;
  }

  const hasMultipleImages = gallery.length > 1;
  const safeIndex = gallery.length ? Math.min(activeImageIndex, gallery.length - 1) : 0;
  const displayPrice = service.price || 799;
  const categoryBadge = service.category || "Omni Care";
  const detailsSections = [
    { title: "What's Included", type: "list", value: service.includes || [] },
    { title: "Service Process", type: "list", value: service.process || [] },
    { title: "Tools Used", type: "list", value: service.tools || [] },
    { title: "Safety Standards", type: "text", value: service.safetyStandards || "Standard safety checklist followed." },
    { title: "Duration", type: "text", value: service.duration || "Varies by home requirements." },
    { title: "Ideal For", type: "text", value: service.idealFor || "Homes seeking consistent, managed care." }
  ];

  const goToPrevious = () => {
    if (!gallery.length) {
      return;
    }
    setActiveImageIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  const goToNext = () => {
    if (!gallery.length) {
      return;
    }
    setActiveImageIndex((prev) => (prev + 1) % gallery.length);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm animate-[modalFade_220ms_ease-out_forwards]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-xl animate-[modalRise_260ms_ease-out_forwards]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${service.title} details`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-full bg-white/90 p-2 text-gray-700 shadow-sm transition-colors hover:text-gray-900"
          aria-label="Close service details"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative h-[350px] w-full overflow-hidden">
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${safeIndex * 100}%)` }}
          >
            {gallery.map((imageSrc, index) => (
              <img
                key={`${service.title}-${index}`}
                src={imageSrc}
                alt={`${service.title} preview ${index + 1}`}
                className="h-full w-full flex-shrink-0 object-cover"
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
          <div className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-800">
            {categoryBadge}
          </div>
          <div className="absolute right-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-800">
            ₹{Number(displayPrice).toLocaleString("en-IN")}
          </div>
          <div className="absolute bottom-5 right-5 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
            {safeIndex + 1}/{gallery.length || 1}
          </div>

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 transition-colors hover:text-gray-900"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 transition-colors hover:text-gray-900"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        <div className="p-10 pb-28">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold text-gray-900">{service.title}</h2>
              <p className="mt-3 text-gray-500">{service.description}</p>
              <p className="mt-4 text-sm font-medium text-gray-700">Trusted by 1,000+ homes</p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-5 py-4 md:min-w-[220px]">
              <p className="text-2xl font-semibold text-gray-900">₹{Number(displayPrice).toLocaleString("en-IN")}</p>
              <p className="text-sm text-gray-600">per visit</p>
              <p className="mt-2 text-xs text-gray-500">Transparent pricing. No hidden charges.</p>
            </div>
          </div>

          <div className="my-6 border-t border-gray-100" />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {detailsSections.map((section) => (
              <div key={section.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-700">{section.title}</h3>
                {section.type === "list" ? (
                  <ul className="mt-3 space-y-2 text-gray-600">
                    {section.value.map((item) => (
                      <li key={item} className="ml-5 list-disc pl-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-gray-600">{section.value}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <div className="flex flex-col gap-4 text-gray-600 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span className="text-sm">Verified Professionals</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm">Background Checked</span>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" />
                <span className="text-sm">Service Support Guarantee</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-gray-100 bg-white px-8 py-4">
          <p className="text-sm text-gray-500">Have questions? Talk to a Care Advisor.</p>
          <button
            type="button"
            onClick={onSchedule}
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition duration-300 hover:bg-black"
          >
            Schedule This Service
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes modalFade {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes modalRise {
            from {
              opacity: 0;
              transform: translateY(12px) scale(0.99);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
    </div>
  );
}

export default ServiceDetailsModal;
