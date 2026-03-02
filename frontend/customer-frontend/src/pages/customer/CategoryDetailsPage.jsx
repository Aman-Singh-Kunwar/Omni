import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, Clock3, Filter, Headset, Home, Search, ShieldCheck } from "lucide-react";
import { careCategories } from "../../components/customer-dashboard/careCategoriesData";
import omniLogo from "../../assets/images/omni-logo.png";
import api from "../../api";

function toServiceSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CategoryNotFound() {
  const navigate = useNavigate();
  return (
    <section className="min-h-screen bg-stone-100 px-6 py-24">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Category</p>
        <h1 className="mt-4 text-3xl font-semibold text-gray-900">We could not find that space.</h1>
        <p className="mt-3 text-gray-600">The category may have moved. Return to your dashboard to continue.</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-8 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
        >
          Back to Dashboard
        </button>
      </div>
    </section>
  );
}

function CategoryDetailsPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false);
  const [advisorStatus, setAdvisorStatus] = useState({ loading: false, error: "" });
  const [advisorToast, setAdvisorToast] = useState("");
  const categoryData = careCategories.find((category) => category.slug === slug);
  const prefilledPlan = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return String(params.get("plan") || "").trim() || "Not selected";
  }, [location.search]);
  const [advisorForm, setAdvisorForm] = useState({
    fullName: "",
    phoneNumber: "",
    category: "",
    selectedPlan: "",
    preferredTime: "Today (Anytime)",
    message: ""
  });

  if (!categoryData) {
    return <CategoryNotFound />;
  }

  const normalizedCategoryQuery = categorySearchQuery.trim().toLowerCase();
  const filteredServices = categoryData.services.filter((service) => {
    if (!normalizedCategoryQuery) {
      return true;
    }

    const searchableText = [
      service.title,
      service.description,
      service.idealFor,
      service.duration,
      ...(Array.isArray(service.includes) ? service.includes : []),
      ...(Array.isArray(service.process) ? service.process : []),
      ...(Array.isArray(service.tools) ? service.tools : [])
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedCategoryQuery);
  });

  const advisorThemeByCategory = {
    "home-care": {
      cardGradient: "from-emerald-50 via-teal-50 to-cyan-50",
      border: "border-emerald-100",
      icon: "text-emerald-600",
      badgeIcon: "text-emerald-600",
      primaryButton: "bg-emerald-600 hover:bg-emerald-700",
      secondaryButton: "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
    },
    "electrical-repairs": {
      cardGradient: "from-amber-50 via-yellow-50 to-orange-50",
      border: "border-amber-100",
      icon: "text-amber-600",
      badgeIcon: "text-amber-600",
      primaryButton: "bg-amber-600 hover:bg-amber-700",
      secondaryButton: "border-amber-200 text-amber-700 hover:bg-amber-50"
    },
    "personal-grooming": {
      cardGradient: "from-rose-50 via-pink-50 to-fuchsia-50",
      border: "border-rose-100",
      icon: "text-rose-600",
      badgeIcon: "text-rose-600",
      primaryButton: "bg-rose-600 hover:bg-rose-700",
      secondaryButton: "border-rose-200 text-rose-700 hover:bg-rose-50"
    },
    "vehicle-care": {
      cardGradient: "from-sky-50 via-blue-50 to-cyan-50",
      border: "border-sky-100",
      icon: "text-sky-600",
      badgeIcon: "text-sky-600",
      primaryButton: "bg-sky-600 hover:bg-sky-700",
      secondaryButton: "border-sky-200 text-sky-700 hover:bg-sky-50"
    }
  };
  const advisorTheme = advisorThemeByCategory[slug] || {
    cardGradient: "from-sky-50 via-indigo-50 to-violet-50",
    border: "border-indigo-100",
    icon: "text-indigo-600",
    badgeIcon: "text-indigo-600",
    primaryButton: "bg-indigo-600 hover:bg-indigo-700",
    secondaryButton: "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
  };

  const resetAdvisorForm = () => {
    setAdvisorForm({
      fullName: "",
      phoneNumber: "",
      category: categoryData.title,
      selectedPlan: prefilledPlan,
      preferredTime: "Today (Anytime)",
      message: ""
    });
    setAdvisorStatus({ loading: false, error: "" });
  };

  const openAdvisorModal = () => {
    resetAdvisorForm();
    setIsAdvisorModalOpen(true);
  };

  const closeAdvisorModal = () => {
    setIsAdvisorModalOpen(false);
    setAdvisorStatus({ loading: false, error: "" });
  };

  const handleAdvisorInputChange = (field, value) => {
    setAdvisorForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdvisorRequestSubmit = async (event) => {
    event.preventDefault();
    const phoneDigits = String(advisorForm.phoneNumber || "").replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setAdvisorStatus({ loading: false, error: "Please enter a valid 10-digit phone number." });
      return;
    }

    setAdvisorStatus({ loading: true, error: "" });
    try {
      await api.post("/customer/advisor-requests", {
        fullName: advisorForm.fullName,
        phoneNumber: phoneDigits,
        category: advisorForm.category,
        selectedPlan: advisorForm.selectedPlan,
        preferredTime: advisorForm.preferredTime,
        message: advisorForm.message
      });
      setAdvisorToast("Callback request submitted successfully.");
      setTimeout(() => setAdvisorToast(""), 3000);
      closeAdvisorModal();
    } catch (error) {
      setAdvisorStatus({
        loading: false,
        error: error?.response?.data?.message || "Unable to submit request right now."
      });
    }
  };

  const handleWhatsAppClick = () => {
    const planForMessage = advisorForm.selectedPlan || prefilledPlan || "Not selected";
    const message = `Hi, I need help regarding ${categoryData.title} - ${planForMessage}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={`min-h-screen ${categoryData.backgroundClass || "bg-stone-100"}`}>
      <section className="relative min-h-[70vh] overflow-hidden">
        <img
          src={categoryData.heroImage}
          alt={categoryData.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className={`absolute inset-0 bg-gradient-to-b ${categoryData.heroOverlayClass || "from-black/55 via-black/30 to-black/15"}`} />
        <div className="absolute left-6 top-6 z-10 flex items-center gap-3 px-1 py-1">
          <img src={omniLogo} alt="Omni logo" className="h-8 w-8 rounded-full object-contain" />
          <div className="leading-tight text-white drop-shadow-sm">
            <p className="text-sm font-semibold tracking-wide">Omni</p>
            <p className="text-xs font-medium text-white/90">{categoryData.title}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="absolute right-6 top-6 z-10 rounded-full bg-white/90 p-2 text-gray-800 shadow-sm transition-colors hover:bg-white"
          aria-label="Go to home page"
        >
          <Home className="h-5 w-5" />
        </button>

        <div className="relative mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-6 text-center lg:px-8">
          <div className={`max-w-3xl space-y-4 ${categoryData.heroTextClass || "text-white"} animate-[fadeIn_600ms_ease-out_forwards]`}>
            <p className="text-xs uppercase tracking-[0.35em] text-white/85">Omni Care</p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">{categoryData.title}</h1>
            <p className="mx-auto max-w-2xl text-base text-white/90 sm:text-lg">{categoryData.tagline}</p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold text-gray-800">Curated Services</h2>
            <p className="text-gray-500">Thoughtfully selected options for a calm, managed home routine.</p>
          </div>
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${categoryData.title.toLowerCase()} services...`}
                value={categorySearchQuery}
                onChange={(event) => setCategorySearchQuery(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white/80 py-3 pl-12 pr-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-800">
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
              <article key={service.title} className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <h3 className="text-2xl font-semibold">{service.title}</h3>
                    <p className="mt-2 text-sm text-white/90">{service.description}</p>
                    <button
                      type="button"
                      onClick={() => navigate(`/customer/category/${slug}/service/${toServiceSlug(service.title)}`)}
                      className="mt-4 text-sm font-medium text-white/95 transition-colors hover:text-white"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!filteredServices.length && (
            <p className="mt-8 text-gray-500">No services match "{categorySearchQuery.trim()}".</p>
          )}
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className={`overflow-hidden rounded-3xl border bg-gradient-to-r px-6 py-8 shadow-sm transition-all duration-200 hover:shadow-md sm:px-8 sm:py-10 ${advisorTheme.border} ${advisorTheme.cardGradient}`}>
            <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
              <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-3xl border border-white/70 bg-white/80 shadow-sm">
                <Headset className={`h-16 w-16 ${advisorTheme.icon}`} />
              </div>
              <div>
                <h3 className="text-3xl font-semibold text-gray-900">Talk to a Care Advisor</h3>
                <p className="mt-2 max-w-2xl text-sm text-gray-600">
                  Get expert guidance for the right service scope, plan, and timing. We help you book faster with confidence.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-medium text-gray-700">
                    <ShieldCheck className={`h-3.5 w-3.5 ${advisorTheme.badgeIcon}`} />
                    Verified Experts
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-medium text-gray-700">
                    <Clock3 className={`h-3.5 w-3.5 ${advisorTheme.badgeIcon}`} />
                    24/7 Support
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-medium text-gray-700">
                    <BadgeCheck className={`h-3.5 w-3.5 ${advisorTheme.badgeIcon}`} />
                    Quick Response
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openAdvisorModal}
                    className={`rounded-xl px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors ${advisorTheme.primaryButton}`}
                  >
                    Request a Call Back
                  </button>
                  <button
                    type="button"
                    onClick={handleWhatsAppClick}
                    className={`rounded-xl border bg-white px-6 py-3 text-sm font-medium shadow-sm transition-colors ${advisorTheme.secondaryButton}`}
                  >
                    Chat on WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isAdvisorModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/35 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeAdvisorModal();
            }
          }}
        >
          <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-xl sm:p-8">
            <div className="mb-5">
              <h4 className="text-2xl font-semibold text-gray-900">Request a Call Back</h4>
              <p className="mt-1 text-sm text-gray-500">Share your details and our advisor will call you shortly.</p>
            </div>
            <form className="space-y-4" onSubmit={handleAdvisorRequestSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={advisorForm.fullName}
                    onChange={(event) => handleAdvisorInputChange("fullName", event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={advisorForm.phoneNumber}
                    onChange={(event) => handleAdvisorInputChange("phoneNumber", event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="10-digit phone number"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    value={advisorForm.category}
                    disabled
                    className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-gray-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Selected Plan</label>
                  <input
                    type="text"
                    value={advisorForm.selectedPlan}
                    disabled
                    className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-gray-600"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Preferred Time</label>
                <select
                  required
                  value={advisorForm.preferredTime}
                  onChange={(event) => handleAdvisorInputChange("preferredTime", event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Today (Anytime)">Today (Anytime)</option>
                  <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                  <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                  <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Message (Optional)</label>
                <textarea
                  rows={3}
                  value={advisorForm.message}
                  onChange={(event) => handleAdvisorInputChange("message", event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tell us your requirement briefly..."
                />
              </div>
              {advisorStatus.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{advisorStatus.error}</p>}
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAdvisorModal}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={advisorStatus.loading}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
                >
                  {advisorStatus.loading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {advisorToast && (
        <div className="fixed right-5 top-5 z-[60] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm">
          {advisorToast}
        </div>
      )}

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

    </div>
  );
}

export default CategoryDetailsPage;
