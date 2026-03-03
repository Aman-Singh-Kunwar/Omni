import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Star, UserCheck, Wrench } from "lucide-react";
import ReviewMediaCarousel from "@shared/components/ReviewMediaCarousel";
import ReviewMediaGallerySection from "@shared/components/ReviewMediaGallerySection";
import ReviewRatingSummary from "@shared/components/ReviewRatingSummary";
import api from "../../api";

function toStars(value) {
  const rating = Math.max(0, Math.min(5, Number(value || 0)));
  return Array.from({ length: 5 }, (_, index) => index < Math.round(rating));
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

function formatInr(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function toAvatarUrl(name) {
  const encodedName = encodeURIComponent(String(name || "Worker"));
  return `https://ui-avatars.com/api/?name=${encodedName}&background=4f46e5&color=ffffff&size=240`;
}

function WorkerJobProfilePage({ authToken = "", defaultWorkerId = "", defaultWorkerName = "" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workerIdFromQuery = String(searchParams.get("workerId") || "").trim();
  const fallbackWorkerId = String(defaultWorkerId || "").trim();
  const workerId = workerIdFromQuery || fallbackWorkerId;
  const workerNameFromQuery = String(searchParams.get("workerName") || "").trim();
  const fallbackWorkerName = String(defaultWorkerName || "").trim();
  const workerName = workerNameFromQuery || (!workerId ? fallbackWorkerName : "");
  const [state, setState] = useState({
    loading: true,
    error: "",
    worker: null,
    reviews: [],
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!workerId && !workerName) {
        setState({
          loading: false,
          error: "Worker details are missing. Please open this page from a worker card.",
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

    loadProfile();
  }, [authToken, workerId, workerName]);

  const worker = state.worker;
  const workerAvatar = worker?.photoUrl || toAvatarUrl(worker?.name || "Worker");
  const services = Array.isArray(worker?.servicesProvided) ? worker.servicesProvided : [];
  const detailedReviews = useMemo(
    () =>
      state.reviews.map((review) => ({
        ...review,
        feedback: String(review.feedback || "").trim() || "No written feedback provided."
      })),
    [state.reviews]
  );

  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  if (state.loading) {
    return (
      <div className="rounded-xl border bg-white/80 p-8 shadow-sm">
        <p className="text-sm text-gray-600">Loading worker profile...</p>
      </div>
    );
  }

  if (state.error || !worker) {
    return (
      <div className="rounded-xl border bg-white/80 p-8 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900">Job Profile</h3>
        <p className="mt-2 text-sm text-red-700">{state.error || "Worker profile was not found."}</p>
        <button
          type="button"
          onClick={handleBackClick}
          className="mt-4 inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-purple-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            <img
              src={workerAvatar}
              alt={worker.name}
              className="h-24 w-24 rounded-full border border-indigo-100 bg-white object-cover shadow-sm sm:h-28 sm:w-28"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Worker Job Profile</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{worker.name}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {services[0] || "Home Service Specialist"}
                {worker.isAvailable ? " - Available now" : " - Currently unavailable"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1 font-medium text-yellow-700">
                  <Star className="h-4 w-4 fill-current" />
                  {Number(worker.averageRating || 0).toFixed(1)} ({Number(worker.reviewCount || 0)} reviews)
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                  <UserCheck className="h-4 w-4" />
                  {Number(worker.completedJobs || 0)} completed jobs
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
                    worker.emailVerified !== false ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  {worker.emailVerified !== false ? "Email verified" : "Email not verified"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
            <p className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <Phone className="h-4 w-4 text-indigo-600" />
              <span>{worker.phone || "Phone not shared"}</span>
            </p>
            <p className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <Mail className="h-4 w-4 text-indigo-600" />
              <span>{worker.email || "Email not shared"}</span>
            </p>
            <p className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 sm:col-span-2">
              <Wrench className="h-4 w-4 text-indigo-600" />
              <span>{services.length ? services.join(", ") : "Services not listed yet"}</span>
            </p>
          </div>
        </div>

        {worker.bio && <p className="mt-5 text-sm leading-6 text-gray-700">{worker.bio}</p>}
      </section>

      <section className="rounded-2xl border bg-white/80 p-6 shadow-sm sm:p-8">
        <h3 className="text-xl font-bold text-gray-900">Detailed Reviews</h3>
        <p className="text-sm text-gray-500">Customer feedback and service ratings</p>

        <ReviewRatingSummary
          className="mb-6 mt-4"
          averageRating={worker.averageRating}
          reviewCount={worker.reviewCount}
          ratingBreakdown={state.ratingBreakdown}
        />
        <ReviewMediaGallerySection className="mb-6" reviews={detailedReviews} />

        <div className="space-y-3">
          {detailedReviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{review.customerName}</p>
                  <p className="text-xs text-gray-500">
                    {review.service}
                    {review.date ? ` - ${review.date}` : ""}
                    {review.time ? ` at ${review.time}` : ""}
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    {toStars(review.rating).map((filled, index) => (
                      <Star
                        key={`${review.id}-star-${index}`}
                        className={`h-4 w-4 ${filled ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{formatInr(review.amount)}</p>
                  <p className="mt-3 text-sm leading-6 text-gray-700">{review.feedback}</p>
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
          {!detailedReviews.length && <p className="text-sm text-gray-500">No reviews available yet.</p>}
        </div>
      </section>
    </div>
  );
}

export default WorkerJobProfilePage;
