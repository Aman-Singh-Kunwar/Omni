import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Star, UserCheck, Wrench } from "lucide-react";
import ReviewMediaCarousel from "@shared/components/ReviewMediaCarousel";
import ReviewMediaGallerySection from "@shared/components/ReviewMediaGallerySection";
import ReviewRatingSummary from "@shared/components/ReviewRatingSummary";
import api from "../../api";

function formatInr(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function toAvatarUrl(name) {
  const encodedName = encodeURIComponent(String(name || "Worker"));
  return `https://ui-avatars.com/api/?name=${encodedName}&background=1d4ed8&color=ffffff&size=240`;
}

function renderStars(rating, keyPrefix) {
  const safeRating = Math.max(0, Math.min(5, Number(rating || 0)));
  return Array.from({ length: 5 }, (_, index) => (
    <Star key={`${keyPrefix}-${index}`} className={`h-4 w-4 ${index < Math.round(safeRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
  ));
}

function CustomerWorkerJobProfilePage({ authToken = "", onBookWorker }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workerId = String(searchParams.get("workerId") || "").trim();
  const workerName = String(searchParams.get("workerName") || "").trim();
  const [state, setState] = useState({
    loading: true,
    error: "",
    worker: null,
    reviews: [],
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  useEffect(() => {
    const loadWorkerProfile = async () => {
      if (!workerId && !workerName) {
        setState({
          loading: false,
          error: "Worker details are missing. Please open a worker profile from dashboard.",
          worker: null,
          reviews: [],
          ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: "" }));
      try {
        const response = await api.get("/worker/public-profile", {
          params: {
            ...(workerId ? { workerId } : {}),
            ...(!workerId && workerName ? { workerName } : {})
          },
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          cache: false
        });

        setState({
          loading: false,
          error: "",
          worker: response.data?.worker || null,
          reviews: Array.isArray(response.data?.reviews) ? response.data.reviews : [],
          ratingBreakdown:
            response.data?.ratingBreakdown && typeof response.data.ratingBreakdown === "object"
              ? response.data.ratingBreakdown
              : { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        });
      } catch (error) {
        setState({
          loading: false,
          error: error.response?.data?.message || "Unable to load worker profile right now.",
          worker: null,
          reviews: [],
          ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        });
      }
    };

    loadWorkerProfile();
  }, [authToken, workerId, workerName]);

  const worker = state.worker;
  const services = useMemo(() => (Array.isArray(worker?.servicesProvided) ? worker.servicesProvided : []), [worker?.servicesProvided]);
  const [selectedService, setSelectedService] = useState("");

  useEffect(() => {
    if (!services.length) {
      setSelectedService("");
      return;
    }
    setSelectedService((prev) => {
      if (prev && services.includes(prev)) {
        return prev;
      }
      return services[0];
    });
  }, [services]);

  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const handleBookNow = () => {
    if (typeof onBookWorker === "function" && worker) {
      onBookWorker({
        id: worker.id,
        name: worker.name,
        servicesProvided: services,
        selectedService
      });
    }
  };

  const renderBookingPanel = () => (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Book This Worker</p>
      <h4 className="mt-2 text-lg font-bold text-gray-900">{worker?.name}</h4>
      <p className="mt-1 text-sm text-gray-600">Pick a job type below, then continue to booking with this worker and service preselected.</p>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-semibold text-gray-800">Select Job Type</label>
        <select
          value={selectedService}
          onChange={(event) => setSelectedService(event.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
          disabled={!services.length}
        >
          {!services.length ? (
            <option value="">No services listed</option>
          ) : (
            services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))
          )}
        </select>
        <p className="mt-2 text-xs text-gray-500">
          {services.length
            ? "You can review date, time, and location on the next screen."
            : "This worker has not listed any services yet."}
        </p>
      </div>

      <button
        type="button"
        onClick={handleBookNow}
        disabled={!selectedService}
        className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        Continue To Booking
      </button>
    </>
  );

  if (state.loading) {
    return (
      <div className="rounded-2xl border bg-white/80 p-6 shadow-sm">
        <p className="text-sm text-gray-600">Loading worker profile...</p>
      </div>
    );
  }

  if (state.error || !worker) {
    return (
      <div className="rounded-2xl border bg-white/80 p-6 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900">Worker Job Profile</h3>
        <p className="mt-2 text-sm text-red-700">{state.error || "Worker profile not found."}</p>
        <button
          type="button"
          onClick={handleBackClick}
          className="mt-4 inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleBackClick}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-cyan-50 p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <img
                  src={worker.photoUrl || toAvatarUrl(worker.name)}
                  alt={worker.name}
                  className="h-24 w-24 rounded-full border border-blue-100 bg-white object-cover"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Professional Worker</p>
                  <h2 className="mt-1 text-2xl font-bold text-gray-900">{worker.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {services[0] || "Home Service Specialist"}
                    {worker.isAvailable ? " - Available now" : " - Unavailable"}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                        worker.emailVerified !== false ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {worker.emailVerified !== false ? "Email Verified" : "Email Not Verified"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1">
                    {renderStars(worker.averageRating, "hero-rating")}
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {Number(worker.averageRating || 0).toFixed(1)} ({Number(worker.reviewCount || 0)} reviews)
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm">
                <p className="text-gray-500">Completed Jobs</p>
                <p className="text-xl font-bold text-blue-700">{Number(worker.completedJobs || 0)}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <p className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700">
                <Phone className="h-4 w-4 text-blue-600" />
                {worker.phone || "Phone not shared"}
              </p>
              <p className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700">
                <Mail className="h-4 w-4 text-blue-600" />
                {worker.email || "Email not shared"}
              </p>
              <p className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 sm:col-span-2">
                <Wrench className="h-4 w-4 text-blue-600" />
                {services.length ? services.join(", ") : "Services not listed yet"}
              </p>
            </div>
            {worker.bio && <p className="mt-4 text-sm leading-6 text-gray-700">{worker.bio}</p>}
          </section>

          <section className="xl:hidden h-fit rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            {renderBookingPanel()}
          </section>

          <section className="rounded-2xl border bg-white/80 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900">Detailed Reviews</h3>
            <p className="mt-1 text-sm text-gray-500">Verified feedback from completed bookings</p>

            <ReviewRatingSummary
              className="mt-4"
              averageRating={worker.averageRating}
              reviewCount={worker.reviewCount}
              ratingBreakdown={state.ratingBreakdown}
            />
            <ReviewMediaGallerySection className="mt-4" reviews={state.reviews} />

            <div className="mt-5 space-y-3">
              {state.reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{review.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {review.service}
                        {review.date ? ` - ${review.date}` : ""}
                        {review.time ? ` at ${review.time}` : ""}
                      </p>
                      <div className="mt-2 flex items-center gap-1">{renderStars(review.rating, review.id)}</div>
                      <p className="mt-1 text-xs text-gray-500">{formatInr(review.amount)}</p>
                      <p className="mt-3 text-sm leading-6 text-gray-700">
                        {String(review.feedback || "").trim() || "No written feedback provided."}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">Reviewed on {formatDate(review.createdAt || review.date)}</p>
                    </div>

                    {Array.isArray(review.feedbackMedia) && review.feedbackMedia.length > 0 && (
                      <div className="w-full lg:w-80 lg:shrink-0">
                        <ReviewMediaCarousel items={review.feedbackMedia} compact className="mt-0" />
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {!state.reviews.length && <p className="text-sm text-gray-500">No reviews available yet.</p>}
            </div>
          </section>
        </div>

        <aside className="hidden xl:block h-fit rounded-2xl border border-blue-100 bg-white p-5 shadow-sm xl:sticky xl:top-24">
          {renderBookingPanel()}
        </aside>
      </div>
    </div>
  );
}

export default CustomerWorkerJobProfilePage;
