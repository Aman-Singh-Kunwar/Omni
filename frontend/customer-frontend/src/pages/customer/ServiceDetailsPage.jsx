import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Star, Tag, X } from "lucide-react";
import { careCategories } from "../../components/customer-dashboard/careCategoriesData";
import ServiceSummaryPopup from "./ServiceSummaryPopup";
import DetailsHeader from "../../components/DetailsHeader";

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

function toServiceSlug(value) {
  return toSafeString(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatInr(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function hashString(value) {
  return toSafeString(value)
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function getEstimatedPrice(categorySlug, title) {
  return 499 + (hashString(`${categorySlug}-${title}`) % 8) * 125;
}

function toId(value) {
  return toSafeString(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseDiscountAmount(...candidates) {
  for (const raw of candidates) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return Math.max(0, Math.round(raw));
    }
    const text = toSafeString(raw);
    if (!text) {
      continue;
    }
    const match = text.match(/(\d[\d,]*)/);
    if (!match) {
      continue;
    }
    const amount = Number(String(match[1]).replace(/,/g, ""));
    if (Number.isFinite(amount) && amount > 0) {
      return Math.round(amount);
    }
  }
  return 0;
}

function getEquipmentImageForLabel(label = "") {
  const normalized = toSafeString(label).trim().toLowerCase();
  const keywordMap = [
    { match: ["multimeter"], query: "digital multimeter" },
    { match: ["circuit tester", "tester"], query: "electrical tester tool" },
    { match: ["insulated toolkit", "insulated tool"], query: "insulated hand tools" },
    { match: ["vacuum"], query: "vacuum cleaner" },
    { match: ["microfiber", "microfibre"], query: "microfiber cloth" },
    { match: ["cleaner", "cleaners"], query: "cleaning chemicals bottle" },
    { match: ["pressure gauge", "pressure meter"], query: "pressure gauge tool" },
    { match: ["pipe", "fitting"], query: "plumbing pipe wrench" },
    { match: ["drill"], query: "power drill machine" },
    { match: ["adhesive", "sealant"], query: "sealant tube" },
    { match: ["comb"], query: "hair comb set" },
    { match: ["facial", "applicator"], query: "facial applicator tools" },
    { match: ["towel"], query: "clean folded towels" },
    { match: ["foam"], query: "car wash foam bottle" },
    { match: ["drying cloth"], query: "car drying microfiber cloth" },
    { match: ["interior-safe cleaners"], query: "car interior cleaner bottle" },
    { match: ["brush"], query: "cleaning brush tool" },
    { match: ["inspection light", "lights"], query: "inspection flashlight" }
  ];

  const mapped = keywordMap.find((item) => item.match.some((word) => normalized.includes(word)));
  const query = encodeURIComponent(mapped?.query || normalized || "home service tools");
  return `https://source.unsplash.com/640x420/?${query}`;
}

function getCategoryTheme(slug) {
  const themes = {
    "home-care": {
      tag: "bg-emerald-50 text-emerald-700",
      ring: "ring-emerald-500",
      button: "bg-emerald-600 hover:bg-emerald-700",
      buttonSolid: "bg-emerald-600",
      check: "text-emerald-600"
    },
    "electrical-repairs": {
      tag: "bg-amber-50 text-amber-700",
      ring: "ring-amber-500",
      button: "bg-amber-600 hover:bg-amber-700",
      buttonSolid: "bg-amber-600",
      check: "text-amber-600"
    },
    "personal-grooming": {
      tag: "bg-rose-50 text-rose-700",
      ring: "ring-rose-500",
      button: "bg-rose-600 hover:bg-rose-700",
      buttonSolid: "bg-rose-600",
      check: "text-rose-600"
    },
    "vehicle-care": {
      tag: "bg-sky-50 text-sky-700",
      ring: "ring-sky-500",
      button: "bg-sky-600 hover:bg-sky-700",
      buttonSolid: "bg-sky-600",
      check: "text-sky-600"
    }
  };

  return themes[slug] || {
    tag: "bg-indigo-50 text-indigo-700",
    ring: "ring-indigo-500",
    button: "bg-indigo-600 hover:bg-indigo-700",
    buttonSolid: "bg-indigo-600",
    check: "text-indigo-600"
  };
}

function getPlanTone(name = "", index = 0) {
  const normalized = toSafeString(name).toLowerCase();
  if (normalized.includes("premium")) {
    return "bg-violet-50 text-violet-700";
  }
  if (normalized.includes("advanced")) {
    return "bg-cyan-50 text-cyan-700";
  }
  if (normalized.includes("essential")) {
    return "bg-emerald-50 text-emerald-700";
  }
  const fallback = ["bg-indigo-50 text-indigo-700", "bg-emerald-50 text-emerald-700", "bg-amber-50 text-amber-700"];
  return fallback[index % fallback.length];
}

function getItemTone(type = "combo", index = 0) {
  const comboTones = ["bg-cyan-50 text-cyan-700", "bg-blue-50 text-blue-700", "bg-teal-50 text-teal-700"];
  const addOnTones = ["bg-purple-50 text-purple-700", "bg-pink-50 text-pink-700", "bg-indigo-50 text-indigo-700"];
  const tones = type === "addon" ? addOnTones : comboTones;
  return tones[index % tones.length];
}

function normalizePlan(rawPlan, index, basePrice, service, categoryTitle) {
  const serviceTitle = toSafeString(service?.title, "Service");
  const safeCategoryTitle = toSafeString(categoryTitle, "Home");
  const name = toSafeString(rawPlan?.name, ["Essential", "Advanced", "Premium"][index] || `Plan ${index + 1}`);
  const discountPrice = Number(rawPlan?.price || basePrice + index * 350);
  const originalPrice = Number(rawPlan?.originalPrice || Math.round(discountPrice * 1.15));
  const includedItems = Array.isArray(rawPlan?.includedItems) && rawPlan.includedItems.length
    ? rawPlan.includedItems.map((item) => toSafeString(item)).filter(Boolean)
    : [...(service.includes || []), ...(service.process || [])].map((item) => toSafeString(item)).filter(Boolean).slice(index, index + 5);

  return {
    id: toId(rawPlan?.id || `${serviceTitle}-${name}-${index}`),
    name,
    tagline: toSafeString(rawPlan?.tagline, `${safeCategoryTitle} care for ${serviceTitle.toLowerCase()}.`),
    duration: toSafeString(rawPlan?.duration, toSafeString(service?.duration, "60 to 90 minutes")),
    price: discountPrice,
    originalPrice,
    popular: Boolean(rawPlan?.popular ?? index === 1),
    includedItems
  };
}

function buildServiceViewModel(service, categoryTitle, gallery, basePrice) {
  const serviceTitle = toSafeString(service?.title, "Service");
  const rating = Number(service.rating || (4.72 + ((hashString(serviceTitle) % 18) / 100)).toFixed(2));
  const reviewCount = Number(service.reviewCount || (1200 + (hashString(serviceTitle) % 1300)));
  const originalPrice = Number(service.originalPrice || Math.round(basePrice * 1.2));
  const discountAmount = Math.max(originalPrice - basePrice, 0);

  const plans = (Array.isArray(service.plans) && service.plans.length
    ? service.plans
    : [{}, {}, {}]
  ).map((plan, index) => normalizePlan(plan, index, basePrice, service, categoryTitle));

  const defaultComboNames = ["Classic care package", "Deep clean package", "Quick refresh package"];
  const defaultComboDescriptions = [
    "Great for regular upkeep and neat spaces.",
    "Best for homes needing extra attention.",
    "Fast cleanup for busy days and quick resets."
  ];
  const defaultComboBadges = ["BEST VALUE", "DEEP CLEAN", "QUICK PICK"];
  const combosSource = Array.isArray(service.combos) && service.combos.length
    ? service.combos
    : (service.process || []).slice(0, 3).map((item, index) => ({
        title: defaultComboNames[index] || item,
        subtitle: defaultComboDescriptions[index] || "Simple, clear and reliable service package.",
        badge: defaultComboBadges[index] || "POPULAR",
        duration: index === 0 ? "1 hr 30 mins" : index === 1 ? "2 hrs 15 mins" : "1 hr",
        price: Math.max(349, Math.round(basePrice * (0.55 + index * 0.18))),
        reviewCount: 1200 + index * 450,
        rating: Number((4.7 + index * 0.05).toFixed(2))
      }));
  const combos = combosSource.map((combo, index) => ({
    id: toId(combo.id || `${serviceTitle}-combo-${index}-${toSafeString(combo.title, `combo-${index + 1}`)}`),
    title: toSafeString(combo.title, defaultComboNames[index] || `Combo ${index + 1}`),
    subtitle: toSafeString(combo.subtitle, defaultComboDescriptions[index] || "Simple and effective service plan."),
    badge: toSafeString(combo.badge, defaultComboBadges[index] || "POPULAR"),
    duration: toSafeString(combo.duration, index === 0 ? "1 hr 30 mins" : "2 hrs"),
    rating: Number(combo.rating || (4.72 + ((index + hashString(serviceTitle)) % 10) / 100).toFixed(2)),
    reviewCount: Number(combo.reviewCount || (900 + index * 350)),
    price: Number(combo.price || 199),
    perUnitLabel: toSafeString(combo.perUnitLabel, `${formatInr(Math.max(149, Math.round((Number(combo.price || 199)) / 2)))} per service`),
    image: combo.image || gallery[index % Math.max(gallery.length, 1)] || service.image
  }));

  const addOnSource = Array.isArray(service.addOns) && service.addOns.length
    ? service.addOns
    : (service.tools || []).slice(0, 4).map((item, index) => ({
        title: item,
        price: 149 + index * 70
      }));
  const addOns = addOnSource.map((item, index) => ({
    id: toId(item.id || `${serviceTitle}-addon-${index}-${toSafeString(item.title, `addon-${index + 1}`)}`),
    title: toSafeString(item.title, `Add-on ${index + 1}`),
    price: Number(item.price || 99),
    image: item.image || getEquipmentImageForLabel(item.title)
  }));

  const discounts = Array.isArray(service.discounts) && service.discounts.length
    ? service.discounts.map((item, index) => ({
        id: toSafeString(item?.id, `discount-${index + 1}`),
        tag: toSafeString(item?.tag, "Offer"),
        title: toSafeString(item?.title, toSafeString(item?.label, `Save ${formatInr(discountAmount || 199)}`)),
        description: toSafeString(item?.description, "Additional savings when you complete booking today."),
        savingsText: toSafeString(item?.savingsText, toSafeString(item?.label, `Save ${formatInr(discountAmount || 199)} today`)),
        expiryText: toSafeString(item?.expiryText, ""),
        amount: parseDiscountAmount(item?.amount, item?.discountAmount, item?.savingsText, item?.label),
        featured: Boolean(item?.featured ?? index === 0)
      }))
    : discountAmount > 0
      ? [
          {
            id: "d-1",
            tag: "Limited",
            title: "Instant booking savings",
            description: "Book now and lock your discounted price.",
            savingsText: `Save ${formatInr(discountAmount)} today`,
            expiryText: "Ends tonight",
            amount: discountAmount,
            featured: true
          },
          {
            id: "d-2",
            tag: "Bonus",
            title: "Flexible support perk",
            description: "Get one free reschedule on this booking.",
            savingsText: "No extra reschedule fee",
            expiryText: "",
            amount: 0,
            featured: false
          }
        ]
      : [];

  const guarantees = Array.isArray(service.guarantees) && service.guarantees.length
    ? service.guarantees.map((item) => toSafeString(item)).filter(Boolean)
    : [
        "Verified professionals for every visit",
        "Safe materials and structured process",
        "7-day service support for covered issues"
      ];

  const faqs = Array.isArray(service.faqs) && service.faqs.length
    ? service.faqs
    : [
        {
          question: "Do I need to provide any materials?",
          answer: "No. The professional brings the core tools and materials needed for the selected service."
        },
        {
          question: "Can I reschedule after booking?",
          answer: "Yes. You can reschedule from your bookings page before service start time."
        },
        {
          question: "Will pricing remain transparent?",
          answer: "Yes. Pricing is shown before booking confirmation with no hidden charges."
        }
      ];

  const reviews = Array.isArray(service.reviews) && service.reviews.length
    ? service.reviews
    : [
        {
          name: "Riya Sharma",
          date: "Feb 26, 2026",
          rating: 5,
          comment: `Excellent ${serviceTitle.toLowerCase()} service. Very professional and detail-oriented.`
        },
        {
          name: "Aman Verma",
          date: "Feb 14, 2026",
          rating: 5,
          comment: "The whole experience felt structured and premium. Great communication and clean execution."
        },
        {
          name: "Kavya Nair",
          date: "Feb 06, 2026",
          rating: 4,
          comment: "Solid quality and smooth process from booking to completion."
        }
      ];

  return {
    name: serviceTitle,
    categoryLabel: toSafeString(categoryTitle || "Service").toUpperCase(),
    rating,
    reviewCount,
    price: basePrice,
    originalPrice,
    duration: toSafeString(service.duration, "60 to 90 minutes"),
    highlights: Array.isArray(service.highlights) && service.highlights.length
      ? service.highlights
      : ["Verified professionals", "Safe materials", "7-day service support", "Flexible scheduling"],
    discount: discountAmount > 0 ? { amount: discountAmount, label: `Save ${formatInr(discountAmount)} Today` } : null,
    beforeAfterImages: Array.isArray(service.beforeAfterImages) && service.beforeAfterImages.length ? service.beforeAfterImages : gallery.slice(0, 4),
    professionals: service.professionals || {
      title: "Top Professionals",
      points: ["Trained for 100+ hours", "Average 4.8+ ratings", "Served 100K+ homes"],
      image: service.image
    },
    equipment: (service.tools || []).map((tool) => ({
      label: toSafeString(tool),
      image: getEquipmentImageForLabel(tool)
    })),
    coveredItems: (service.includes || []).map((item) => toSafeString(item)).filter(Boolean),
    plans,
    combos,
    addOns,
    discounts,
    guarantees,
    faqs,
    reviews
  };
}

function PlanDetailsPopup({ open, onClose, plan, planImages, onAddPlan, theme }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
    setActiveImageIndex(0);
  }, [plan?.id, open]);

  if (!open || !plan) {
    return null;
  }

  const images = Array.isArray(planImages) && planImages.length ? planImages : [];
  const safeIndex = Math.min(activeImageIndex, Math.max(images.length - 1, 0));

  const highlightPoints = (plan.includedItems || []).slice(0, 4);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${plan.name} plan details`}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPlanTone(plan.name)}`}>
                {plan.name} plan
              </span>
              <h3 className="mt-3 text-3xl font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{plan.tagline}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200"
              aria-label="Close plan details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Plan Price</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-3xl font-semibold text-gray-900">{formatInr(plan.price)}</p>
                      {plan.originalPrice > plan.price && (
                        <p className="text-sm text-gray-400 line-through">{formatInr(plan.originalPrice)}</p>
                      )}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-gray-200" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Duration</p>
                    <p className="mt-1 text-base font-medium text-gray-800">{plan.duration}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">No hidden charges. Clean execution. Trusted professionals.</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                <h4 className="text-base font-semibold text-gray-900">Why this plan works</h4>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {highlightPoints.map((item, index) => (
                    <div key={`plan-highlight-${index}`} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className={`mt-0.5 h-4 w-4 ${theme.check}`} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                <h4 className="text-base font-semibold text-gray-900">Everything included</h4>
                <div className="mt-3 space-y-2">
                  {plan.includedItems.map((item, index) => (
                    <div key={`plan-item-${index}`} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className={`mt-0.5 h-4 w-4 ${theme.check}`} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onAddPlan(plan.id)}
                  className={`rounded-xl px-5 py-3 text-sm font-semibold text-white ${theme.button}`}
                >
                  Add Plan
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="lg:justify-self-end">
              <div className="relative h-[240px] w-full max-w-sm overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
                {images.length ? (
                  <div
                    className="flex h-full transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${safeIndex * 100}%)` }}
                  >
                    {images.map((image, index) => (
                      <img key={`${image}-${index}`} src={image} alt={`${plan.name} preview ${index + 1}`} className="h-full w-full flex-shrink-0 object-cover" />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">No images available</div>
                )}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 shadow-sm"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 shadow-sm"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceNotFound() {
  const navigate = useNavigate();
  return (
    <section className="min-h-screen bg-gray-100 px-6 py-24">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-10 text-center shadow-sm">
        <h1 className="text-3xl font-semibold text-gray-900">Service not found</h1>
        <p className="mt-3 text-gray-600">The selected service may have changed. Please return to the category page.</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-8 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Back to dashboard
        </button>
      </div>
    </section>
  );
}

function ServiceDetailsPage() {
  const navigate = useNavigate();
  const { slug, serviceSlug } = useParams();
  const plansRef = useRef(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [activePlanDetailsId, setActivePlanDetailsId] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [selectedComboIds, setSelectedComboIds] = useState([]);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState([]);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [showBillDetails, setShowBillDetails] = useState(false);

  const category = careCategories.find((item) => item.slug === slug);
  const service = useMemo(
    () => (category?.services || []).find((item) => toServiceSlug(item.title) === String(serviceSlug || "").trim().toLowerCase()) || null,
    [category?.services, serviceSlug]
  );

  useEffect(() => {
    setImageIndex(0);
    setIsSummaryOpen(true);
    setSearchQuery("");
    setActivePlanDetailsId("");
    setSelectedOfferId("");
    setSelectedComboIds([]);
    setSelectedAddOnIds([]);
    setOpenFaqIndex(0);
    setShowBillDetails(false);
  }, [serviceSlug]);

  if (!category || !service) {
    return <ServiceNotFound />;
  }

  const gallery = Array.isArray(service.gallery) && service.gallery.length ? service.gallery : [service.image];
  const safeIndex = Math.min(imageIndex, gallery.length - 1);
  const basePrice = getEstimatedPrice(slug, service.title);
  const viewModel = buildServiceViewModel(service, category.title, gallery, basePrice);
  const theme = getCategoryTheme(slug);

  const normalizedSearch = String(searchQuery || "").trim().toLowerCase();
  const matchesSearch = (value) => toSafeString(value).toLowerCase().includes(normalizedSearch);
  const matchesArray = (values = []) => values.some((item) => matchesSearch(item));

  const filteredPlans = viewModel.plans.filter(
    (plan) => !normalizedSearch || matchesSearch(plan.name) || matchesSearch(plan.tagline) || matchesArray(plan.includedItems)
  );
  const filteredCombos = viewModel.combos.filter(
    (item) => !normalizedSearch || matchesSearch(item.title) || matchesSearch(item.subtitle) || matchesSearch(item.badge)
  );
  const filteredAddOns = viewModel.addOns.filter((item) => !normalizedSearch || matchesSearch(item.title));
  const filteredCoveredItems = viewModel.coveredItems.filter((item) => !normalizedSearch || matchesSearch(item));
  const filteredFaqs = viewModel.faqs.filter(
    (item) => !normalizedSearch || matchesSearch(item.question) || matchesSearch(item.answer)
  );
  const filteredGuarantees = viewModel.guarantees.filter((item) => !normalizedSearch || matchesSearch(item));

  useEffect(() => {
    if (!filteredPlans.length) {
      setSelectedPlanId("");
      return;
    }

    setSelectedPlanId((prev) => {
      if (prev && filteredPlans.some((plan) => plan.id === prev)) {
        return prev;
      }
      return filteredPlans[0].id;
    });
  }, [filteredPlans]);

  const selectedPlan = viewModel.plans.find((plan) => plan.id === selectedPlanId) || null;
  const activePlanDetails =
    viewModel.plans.find((plan) => plan.id === activePlanDetailsId) ||
    filteredPlans.find((plan) => plan.id === activePlanDetailsId) ||
    null;
  const activePlanImages = useMemo(() => {
    if (!activePlanDetails) {
      return [];
    }
    const directImages = Array.isArray(activePlanDetails.images) ? activePlanDetails.images.filter(Boolean) : [];
    const includedItemImages = (activePlanDetails.includedItems || []).map((item) => getEquipmentImageForLabel(item));
    const pool = [...directImages, ...gallery, ...includedItemImages, ...viewModel.beforeAfterImages, ...(viewModel.equipment || []).map((item) => item.image)];
    return Array.from(new Set(pool.filter(Boolean))).slice(0, 8);
  }, [activePlanDetails, gallery, viewModel.beforeAfterImages, viewModel.equipment]);
  const selectedCombos = viewModel.combos.filter((item) => selectedComboIds.includes(item.id));
  const selectedAddOns = viewModel.addOns.filter((item) => selectedAddOnIds.includes(item.id));
  const selectedExtras = [...selectedCombos, ...selectedAddOns];
  const extrasTotal = [...selectedCombos, ...selectedAddOns].reduce((sum, item) => sum + Number(item.price || 0), 0);
  const subtotalPrice = Number(selectedPlan?.price || viewModel.price) + extrasTotal;
  const selectedOffer = viewModel.discounts.find((offer) => offer.id === selectedOfferId) || null;
  const appliedDiscount = Math.min(Number(selectedOffer?.amount || 0), subtotalPrice);
  const totalPrice = Math.max(0, subtotalPrice - appliedDiscount);
  const billDetailItems = [
    toSafeString(viewModel.name, "Service"),
    `Plan: ${selectedPlan ? selectedPlan.name : "No plan selected"}`,
    ...(selectedExtras.length > 0 ? selectedExtras.map((item) => toSafeString(item.title)) : ["No add-ons selected"]),
    ...(selectedOffer ? [`Offer: ${toSafeString(selectedOffer.title)}`] : [])
  ].filter(Boolean);
  const compactBillItems = billDetailItems.slice(0, 3);
  const hiddenBillCount = Math.max(0, billDetailItems.length - compactBillItems.length);

  const bookingServiceByTitle = {
    "House Cleaning": "House Cleaning",
    "Carpentry Care": "Carpenter",
    "Plumbing Support": "Plumber",
    "Electrical Care": "Electrician",
    "AC Maintenance": "AC Repair",
    "General Repairs": "Carpenter",
    "At-Home Hair Styling": "Hair Stylist",
    "Skin & Glow Rituals": "Hair Stylist",
    "Wellness Grooming": "Hair Stylist",
    "Premium Car Wash": "Car Service",
    "Interior Detailing": "Car Service",
    "Routine Car Care": "Car Service"
  };

  const toggleSelection = (id, setter) => {
    setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const goToBooking = () => {
    const bookingService = bookingServiceByTitle[service.title] || service.title;
    const params = new URLSearchParams({
      source: "service",
      service: bookingService,
      price: String(Math.max(0, Math.round(totalPrice))),
      plan: selectedPlan?.name || "",
      addons: [...selectedCombos, ...selectedAddOns].map((item) => item.title).join(",")
      ,
      offer: selectedOffer?.title || "",
      discount: String(appliedDiscount)
    });
    navigate(`/bookings/new?${params.toString()}`);
  };

  const openPlansSection = () => {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const serviceSummaryData = {
    ...viewModel,
    coveredItems: filteredCoveredItems,
    plans: filteredPlans,
    combos: filteredCombos,
    addOns: filteredAddOns,
    faqs: filteredFaqs,
    guarantees: filteredGuarantees,
    price: totalPrice
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <DetailsHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder={`Search in ${category.title} details...`}
      />

      <section className="bg-gradient-to-b from-white to-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-gray-50/60 p-8">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div className="max-w-lg space-y-5">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${theme.tag}`}>
                  {viewModel.categoryLabel}
                </span>
                <h1 className="text-4xl font-semibold leading-tight text-gray-900">{viewModel.name}</h1>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className={`h-4 w-4 fill-current ${theme.check}`} />
                  <span className="font-medium text-gray-900">{Number(viewModel.rating).toFixed(1)}</span>
                  <span className="h-1 w-1 rounded-full bg-gray-300" />
                  <span className="text-gray-500">{Number(viewModel.reviewCount).toLocaleString("en-IN")} reviews</span>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-3xl font-semibold text-gray-900">{formatInr(selectedPlan?.price || viewModel.price)}</p>
                    {(selectedPlan?.originalPrice || viewModel.originalPrice) > (selectedPlan?.price || viewModel.price) && (
                      <p className="ml-2 text-sm text-gray-400 line-through">{formatInr(selectedPlan?.originalPrice || viewModel.originalPrice)}</p>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{selectedPlan?.duration || viewModel.duration}</p>
                  <p className="mt-2 text-xs text-gray-500">Transparent pricing. No hidden charges.</p>
                </div>

                {viewModel.discount && (
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${theme.tag}`}>
                    {viewModel.discount.label}
                  </span>
                )}

                <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                  {viewModel.highlights.slice(0, 4).map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className={`h-4 w-4 ${theme.check}`} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={goToBooking}
                    className={`rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg ${theme.button}`}
                  >
                    {selectedPlan ? "Select Plan" : "Add to Cart"}
                  </button>
                  <button
                    type="button"
                    onClick={openPlansSection}
                    className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50"
                  >
                    View Plans
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                <div className="relative min-h-[420px] overflow-hidden rounded-2xl shadow-lg">
                  <div
                    className="flex h-full transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${safeIndex * 100}%)` }}
                  >
                    {gallery.map((image, index) => (
                      <img key={`${service.title}-${index}`} src={image} alt={service.title} className="h-full w-full flex-shrink-0 object-cover" />
                    ))}
                  </div>
                  {gallery.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setImageIndex((prev) => (prev - 1 + gallery.length) % gallery.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 shadow-sm"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageIndex((prev) => (prev + 1) % gallery.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 shadow-sm"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {gallery.map((image, index) => (
                    <button
                      type="button"
                      key={`${image}-${index}`}
                      onClick={() => setImageIndex(index)}
                      className={`h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl shadow-sm ${index === safeIndex ? `ring-2 ${theme.ring}` : ""}`}
                      aria-label={`Show preview image ${index + 1}`}
                    >
                      <img src={image} alt={`${service.title} preview ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!!filteredPlans.length && (
        <section ref={plansRef} className="py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="text-3xl font-semibold text-gray-900">Choose a Plan</h2>
            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
              {filteredPlans.map((plan) => {
                const selected = selectedPlanId === plan.id;
                return (
                  <article
                    key={plan.id}
                    className={`rounded-2xl bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${selected ? `border-2 ${theme.ring}` : "border border-gray-200"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>
                        <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getPlanTone(plan.name)}`}>
                          {plan.name} plan
                        </span>
                      </div>
                      {plan.popular && (
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">Most Popular</span>
                      )}
                    </div>
                    <p className="mt-4 text-sm text-gray-500">{plan.duration}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <p className="text-2xl font-semibold text-gray-900">{formatInr(plan.price)}</p>
                      {plan.originalPrice > plan.price && (
                        <p className="text-sm text-gray-400 line-through">{formatInr(plan.originalPrice)}</p>
                      )}
                    </div>
                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActivePlanDetailsId(plan.id);
                        }}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${theme.button}`}
                      >
                        Add
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {(filteredCombos.length > 0 || filteredAddOns.length > 0) && (
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="text-3xl font-semibold text-gray-900">Combos and Add-ons</h2>

            {filteredCombos.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900">Combos</h3>
                <div className="mt-4 space-y-5">
                  {filteredCombos.map((item, index) => {
                    const selected = selectedComboIds.includes(item.id);
                    return (
                      <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                        <div className="grid gap-4 md:grid-cols-[1fr_190px]">
                          <div>
                            <h4 className="text-2xl font-semibold text-gray-900">{item.title}</h4>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                              <Star className={`h-4 w-4 fill-current ${theme.check}`} />
                              <span>{item.rating}</span>
                              <span>({Number(item.reviewCount).toLocaleString("en-IN")} reviews)</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-gray-700">
                              <p className="text-2xl font-semibold text-gray-900">{formatInr(item.price)}</p>
                              <span className="text-gray-400">•</span>
                              <p className="text-sm text-gray-500">{item.duration}</p>
                            </div>
                            <div className="mt-2 flex items-center gap-1 text-sm text-emerald-600">
                              <Tag className="h-4 w-4" />
                              <span>{item.perUnitLabel}</span>
                            </div>
                            <p className="mt-3 text-sm text-gray-600">{item.subtitle}</p>
                            <button
                              type="button"
                              onClick={() => setIsSummaryOpen(true)}
                              className="mt-3 text-base font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
                            >
                              View details
                            </button>
                          </div>

                          <div className="relative">
                            <div className="h-40 overflow-hidden rounded-xl bg-gray-100">
                              <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                            </div>
                            <span className={`absolute left-2 top-2 rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide ${getItemTone("combo", index)}`}>
                              {item.badge}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSelection(item.id, setSelectedComboIds)}
                              className={`absolute bottom-[-12px] left-1/2 -translate-x-1/2 rounded-xl border px-7 py-2 text-base font-semibold ${
                                selected ? `${theme.buttonSolid} border-transparent text-white` : "border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50"
                              }`}
                            >
                              {selected ? "Added" : "Add"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredAddOns.length > 0 && (
              <div className="mt-7">
                <h3 className="text-lg font-semibold text-gray-900">Add-ons</h3>
                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
                  {filteredAddOns.map((item, index) => {
                    const selected = selectedAddOnIds.includes(item.id);
                    return (
                      <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
                        <div className="h-36 overflow-hidden rounded-xl bg-gray-100">
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                        </div>
                        <p className="mt-3 text-base font-semibold text-gray-900">{item.title}</p>
                        <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getItemTone("addon", index)}`}>
                          Add-on
                        </span>
                        <p className="mt-1 text-sm text-gray-600">{formatInr(item.price)}</p>
                        <button
                          type="button"
                          onClick={() => toggleSelection(item.id, setSelectedAddOnIds)}
                          className={`mt-3 rounded-xl px-4 py-2 text-sm font-medium ${
                            selected ? `${theme.buttonSolid} text-white` : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {selected ? "Added" : "Add"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {!!viewModel.discounts.length && (
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mt-4 space-y-2">
              <h3 className="text-2xl font-semibold text-gray-900">Exclusive Savings</h3>
              <p className="text-sm text-gray-500">Save more when you book today</p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {viewModel.discounts.map((discount) => (
                <article
                  key={`discount-${toId(discount.id || discount.title || "item")}`}
                  className={`rounded-2xl bg-white p-6 transition-all duration-200 ${
                    selectedOfferId === discount.id
                      ? "border-2 border-indigo-500 shadow-lg"
                      : "border border-gray-200 shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {!!toSafeString(discount.tag) && (
                      <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs text-white">{toSafeString(discount.tag, "Offer")}</span>
                    )}
                    {discount.featured && (
                      <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                        Recommended
                      </span>
                    )}
                  </div>

                  <h4 className="mt-4 text-lg font-semibold text-gray-900">{toSafeString(discount.title)}</h4>
                  <p className="mt-2 text-sm text-gray-600">{toSafeString(discount.description)}</p>
                  <p className="mt-3 text-2xl font-semibold text-indigo-600">
                    {toSafeString(discount.savingsText, `Save ${formatInr(Number(discount.amount || 0))}`)}
                  </p>
                  {toSafeString(discount.expiryText) && <p className="mt-2 text-xs text-red-500">{toSafeString(discount.expiryText)}</p>}
                  <button
                    type="button"
                    onClick={() => setSelectedOfferId(discount.id)}
                    className={`mt-5 rounded-xl px-5 py-2 text-sm transition-colors ${
                      selectedOfferId === discount.id
                        ? "bg-indigo-600 text-white"
                        : "border border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                    }`}
                  >
                    {selectedOfferId === discount.id ? "Applied ✓" : "Apply"}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {!!filteredGuarantees.length && (
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 shadow-sm transition-all duration-200 hover:shadow-md">
              <h3 className="text-2xl font-semibold text-gray-900">Service Guarantee</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {filteredGuarantees.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className={`mt-0.5 h-4 w-4 ${theme.check}`} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {!!filteredFaqs.length && (
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h3 className="text-3xl font-semibold text-gray-900">Frequently Asked Questions</h3>
            <div className="mt-6 divide-y divide-gray-100 rounded-2xl bg-white shadow-sm">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <article key={faq.question} className="px-5 py-2">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                      className={`flex w-full items-center justify-between gap-4 py-4 text-left ${isOpen ? theme.check : "text-gray-800"}`}
                    >
                      <span className="text-base font-medium">{faq.question}</span>
                      <span className={`text-xs font-semibold transition-transform ${isOpen ? "rotate-180" : ""}`}>v</span>
                    </button>
                    <div className={`grid overflow-hidden transition-all duration-300 ${isOpen ? "grid-rows-[1fr] pb-4 opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <p className="min-h-0 text-sm text-gray-600">{faq.answer}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 rounded-2xl border border-gray-200 px-6 py-4 shadow-sm lg:px-8">
          <div className="min-w-0 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="text-base font-semibold uppercase tracking-wide text-indigo-700">Bill Details</p>
              <span className="h-4 w-px bg-indigo-100" />
              {compactBillItems.map((item, index) => (
                <span key={`compact-bill-item-${index}`} className="text-sm text-gray-700">
                  + {item}
                </span>
              ))}
              {hiddenBillCount > 0 && !showBillDetails && (
                <button
                  type="button"
                  onClick={() => setShowBillDetails(true)}
                  className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  +{hiddenBillCount} more details
                </button>
              )}
              {showBillDetails && (
                <button
                  type="button"
                  onClick={() => setShowBillDetails(false)}
                  className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  Hide details
                </button>
              )}
            </div>
            {showBillDetails && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-indigo-100 pt-2">
                {billDetailItems.map((item, index) => (
                  <span key={`bill-item-${index}`} className="text-sm text-gray-600">
                    + {item}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2.5 space-y-0.5 border-t border-indigo-100 pt-2">
              <p className="text-sm text-gray-600">Subtotal: {formatInr(subtotalPrice)}</p>
              <p className="text-sm font-medium text-indigo-600">Discount: - {formatInr(appliedDiscount)}</p>
              <p className="text-xl font-semibold text-gray-900">Final Total: {formatInr(totalPrice)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={goToBooking}
            className={`rounded-xl px-6 py-3 text-sm font-semibold text-white transition-colors ${theme.button}`}
          >
            Continue to Booking
          </button>
        </div>
      </div>

      <ServiceSummaryPopup
        open={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        onBookNow={goToBooking}
        service={serviceSummaryData}
      />
      <PlanDetailsPopup
        open={Boolean(activePlanDetails)}
        onClose={() => setActivePlanDetailsId("")}
        plan={activePlanDetails}
        planImages={activePlanImages}
        onAddPlan={(planId) => {
          setSelectedPlanId(planId);
          setActivePlanDetailsId("");
        }}
        theme={theme}
      />
    </div>
  );
}

export default ServiceDetailsPage;

