import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Star, X } from "lucide-react";

function toSafeString(value, fallback = "") {
  try {
    if (value == null) {
      return fallback;
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (typeof value === "object") {
      if (typeof value.title === "string") {
        return value.title;
      }
      if (typeof value.label === "string") {
        return value.label;
      }
      const serialized = JSON.stringify(value);
      return serialized && serialized !== "{}" ? serialized : fallback;
    }
    return String(value);
  } catch (_error) {
    return fallback;
  }
}

function formatInr(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function buildRatingBreakdown(reviewCount = 0) {
  const total = Math.max(Number(reviewCount) || 0, 1);
  const five = Math.round(total * 0.84);
  const four = Math.round(total * 0.1);
  const three = Math.round(total * 0.035);
  const two = Math.round(total * 0.015);
  const one = Math.max(total - (five + four + three + two), 0);
  return [
    { label: "5", value: five },
    { label: "4", value: four },
    { label: "3", value: three },
    { label: "2", value: two },
    { label: "1", value: one }
  ];
}

function ServiceSummaryPopup({ open, onClose, onBookNow, service }) {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const ratingBars = useMemo(() => buildRatingBreakdown(service?.reviewCount), [service?.reviewCount]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [onClose, open]);

  useEffect(() => {
    setOpenFaqIndex(0);
  }, [service?.name]);

  if (!open || !service) {
    return null;
  }

  const beforeAfterImages = Array.isArray(service.beforeAfterImages) ? service.beforeAfterImages.filter(Boolean) : [];
  const equipment = Array.isArray(service.equipment) ? service.equipment.filter((item) => item?.label) : [];
  const coveredItems = Array.isArray(service.coveredItems) ? service.coveredItems.filter(Boolean) : [];
  const faqs = Array.isArray(service.faqs) ? service.faqs.filter((item) => item?.question && item?.answer) : [];
  const reviews = Array.isArray(service.reviews) ? service.reviews.filter((item) => item?.name && item?.comment) : [];
  const maxBarValue = Math.max(...ratingBars.map((item) => item.value), 1);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm animate-[popupFade_220ms_ease-out_forwards]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${toSafeString(service.name, "Service")} service summary`}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-xl animate-[popupScale_260ms_ease-out_forwards]"
      >
        <div className="p-8 pb-28">
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Service Plan</p>
                <h2 className="mt-2 text-3xl font-semibold text-gray-900">{toSafeString(service.name)}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-teal-600 text-teal-600" />
                    {Number(service.rating || 0).toFixed(2)}
                  </span>
                  <span>({Number(service.reviewCount || 0).toLocaleString("en-IN")} reviews)</span>
                  <span>{formatInr(service.price)}</span>
                  <span>{toSafeString(service.duration)}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">No hidden charges.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBookNow}
                  className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close service summary"
                  className="rounded-full bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-6 border-t border-gray-100" />
          </section>

          {beforeAfterImages.length > 0 && (
            <section className="py-8">
              <h3 className="text-3xl font-semibold text-gray-900">See the difference</h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {beforeAfterImages.slice(0, 4).map((image, index) => (
                  <article key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md">
                    <div className="relative">
                      <img src={image} alt={`Before and after ${index + 1}`} className="h-56 w-full object-cover" />
                      <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white/75" />
                      <span className="absolute left-3 top-3 rounded-full bg-black/35 px-3 py-1 text-xs text-white">Before</span>
                      <span className="absolute right-3 top-3 rounded-full bg-black/35 px-3 py-1 text-xs text-white">After</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {service.professionals && (
            <section className="py-8">
              <div className="grid gap-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm transition-all duration-200 hover:shadow-md lg:grid-cols-[1fr_300px]">
                <div>
                  <h3 className="text-3xl font-semibold text-gray-900">{service.professionals.title || "Top professionals"}</h3>
                  <div className="mt-5 space-y-3">
                    {(service.professionals.points || []).map((point, index) => (
                      <div key={`pro-point-${index}`} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600" />
                        <p className="text-base text-gray-600">{toSafeString(point)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {service.professionals.image && (
                  <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <img src={service.professionals.image} alt="Top professional" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </section>
          )}

          {equipment.length > 0 && (
            <section className="py-8">
              <h3 className="text-3xl font-semibold text-gray-900">Equipment and materials used</h3>
              <div className="mt-6 flex gap-4 overflow-x-auto pb-1">
                {equipment.map((item, index) => (
                  <article key={`equipment-${index}`} className="min-w-[200px] rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm transition-all duration-200 hover:shadow-md">
                    <div className="h-24 overflow-hidden rounded-xl bg-white">
                      {item.image ? (
                        <img src={item.image} alt={toSafeString(item.label)} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm font-medium text-gray-400">{toSafeString(item.label).slice(0, 2).toUpperCase()}</div>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-700">{toSafeString(item.label)}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {coveredItems.length > 0 && (
            <section className="py-8">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                <h3 className="text-3xl font-semibold text-gray-900">What is covered</h3>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {coveredItems.map((item, index) => (
                    <div key={`covered-${index}`} className="flex items-start gap-2 rounded-xl bg-white p-3">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600" />
                      <p className="text-sm text-gray-600">{toSafeString(item)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {faqs.length > 0 && (
            <section className="py-8">
              <h3 className="text-3xl font-semibold text-gray-900">Frequently asked questions</h3>
              <div className="mt-5 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
                {faqs.map((item, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <article key={`faq-${index}`} className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                        className={`flex w-full items-center justify-between gap-4 rounded-xl px-2 py-4 text-left ${isOpen ? "text-teal-700" : "text-gray-800"}`}
                      >
                        <span className="text-base font-medium">{toSafeString(item.question)}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180 text-teal-700" : "text-gray-500"}`} />
                      </button>
                      <div
                        className={`grid overflow-hidden transition-all duration-300 ${isOpen ? "grid-rows-[1fr] pb-3 opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                      >
                        <p className="min-h-0 text-sm text-gray-600">{toSafeString(item.answer)}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {reviews.length > 0 && (
            <section className="py-8">
              <div className="grid gap-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md lg:grid-cols-[300px_1fr]">
                <div>
                  <div className="flex items-end gap-2">
                    <p className="text-5xl font-semibold text-gray-900">{Number(service.rating || 0).toFixed(2)}</p>
                    <Star className="h-5 w-5 fill-teal-600 text-teal-600" />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{Number(service.reviewCount || 0).toLocaleString("en-IN")} reviews</p>
                  <div className="mt-5 space-y-3">
                    {ratingBars.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="w-4 text-sm text-gray-700">{item.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.max((item.value / maxBarValue) * 100, 2)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {reviews.slice(0, 4).map((review, index) => (
                    <article key={`review-${index}`} className="rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-gray-900">{toSafeString(review.name)}</p>
                          <p className="mt-1 text-xs text-gray-500">{toSafeString(review.date)}</p>
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-xl bg-white px-2 py-1 shadow-sm">
                          <Star className="h-3.5 w-3.5 fill-teal-600 text-teal-600" />
                          <span className="text-xs font-semibold text-gray-700">{review.rating}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-gray-600">{toSafeString(review.comment)}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-gray-100 bg-white px-8 py-4">
          <div>
            <p className="text-sm text-gray-500">{toSafeString(service.name)}</p>
            <p className="text-lg font-semibold text-gray-900">{formatInr(service.price)}</p>
          </div>
          <button
            type="button"
            onClick={onBookNow}
            className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Book Now
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes popupFade {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes popupScale {
            from {
              opacity: 0;
              transform: scale(0.97) translateY(8px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}

export default ServiceSummaryPopup;
