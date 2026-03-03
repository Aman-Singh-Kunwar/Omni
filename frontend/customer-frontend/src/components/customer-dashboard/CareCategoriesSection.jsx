import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { careCategories } from "./careCategoriesData";

const INITIAL_VISIBLE_SERVICES = 8;
const LOAD_MORE_STEP = 8;
const DASHBOARD_CATEGORY_SLUGS = new Set(["home-care", "personal-grooming"]);

function toServiceSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CareCategoriesSection({ searchQuery = "" }) {
  const normalizedQuery = String(searchQuery || "").trim().toLowerCase();
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_SERVICES);

  const dashboardServices = useMemo(() => {
    const cards = careCategories
      .filter((category) => DASHBOARD_CATEGORY_SLUGS.has(String(category.slug || "").trim().toLowerCase()))
      .flatMap((category) =>
        (Array.isArray(category.services) ? category.services : []).map((service, index) => {
          const title = String(service?.title || "").trim();
          return {
            id: `${category.slug}-${toServiceSlug(title)}-${index}`,
            categorySlug: String(category.slug || "").trim(),
            categoryTitle: String(category.title || "").trim() || "Service",
            title,
            description: String(service?.description || "").trim(),
            image: String(service?.image || category.cardImage || category.heroImage || "").trim()
          };
        })
      )
      .filter((service) => service.title && service.image);

    if (!normalizedQuery) {
      return cards;
    }
    return cards.filter((service) => service.title.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_SERVICES);
  }, [normalizedQuery]);

  const servicesToRender = normalizedQuery ? dashboardServices : dashboardServices.slice(0, visibleCount);
  const hasMoreServices = !normalizedQuery && dashboardServices.length > visibleCount;

  const handleExploreService = (categorySlug, serviceTitle) => {
    navigate(`/customer/category/${categorySlug}/service/${toServiceSlug(serviceTitle)}`);
  };

  return (
    <section className="w-full bg-white py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <header className="space-y-3">
          <h2 className="text-3xl font-semibold text-gray-800 sm:text-4xl">Your Needs</h2>
          <p className="text-base text-gray-500">Home Care and Personal Grooming services, ready to book.</p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {servicesToRender.map((service) => (
            <article
              key={service.id}
              className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                  {service.categoryTitle}
                </span>
              </div>

              <div className="space-y-2 p-4">
                <h3 className="line-clamp-1 text-lg font-semibold text-gray-900">{service.title}</h3>
                <p className="line-clamp-2 text-sm text-gray-600">{service.description || "Professional doorstep service."}</p>
                <button
                  type="button"
                  onClick={() => handleExploreService(service.categorySlug, service.title)}
                  className="pt-1 text-sm font-semibold text-gray-700 transition-colors duration-200 hover:text-gray-900"
                >
                  Explore Service
                </button>
              </div>
            </article>
          ))}
        </div>

        {!servicesToRender.length && (
          <p className="mt-8 text-gray-500">No services match "{String(searchQuery || "").trim()}".</p>
        )}

        {hasMoreServices && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default CareCategoriesSection;
