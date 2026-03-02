import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { careCategories } from "./careCategoriesData";

function CareCategoriesSection({ searchQuery = "" }) {
  const normalizedQuery = String(searchQuery || "").trim().toLowerCase();
  const navigate = useNavigate();

  const visibleCategories = useMemo(() => {
    if (!normalizedQuery) {
      return careCategories;
    }

    return careCategories.filter((category) => {
      const serviceTitles = category.services.map((service) => service.title);
      const categoryTerms = [category.title, category.cardTagline, category.tagline, ...serviceTitles].join(" ").toLowerCase();
      return categoryTerms.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const handleExplore = (slug) => navigate(`/customer/category/${slug}`);

  return (
    <section className="w-full bg-white py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <header className="space-y-3">
          <h2 className="text-3xl font-semibold text-gray-800 sm:text-4xl">Your Home Needs</h2>
          <p className="text-base text-gray-500">Everything your space needs, thoughtfully managed.</p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-4">
          {visibleCategories.map((category) => (
            <article key={category.slug} className="group rounded-3xl border border-gray-200 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="overflow-hidden rounded-3xl shadow-sm">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={category.cardImage || category.heroImage}
                    alt={category.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
                  />
                </div>
              </div>

              <div className="space-y-2 px-1 pt-5">
                <h3 className="text-xl font-semibold text-gray-800">{category.title}</h3>
                <p className="text-gray-500">{category.cardTagline || category.tagline}</p>
                <button
                  type="button"
                  onClick={() => handleExplore(category.slug)}
                  className="text-sm font-medium text-gray-700 transition-colors duration-300 hover:text-gray-900"
                >
                  Explore →
                </button>
              </div>
            </article>
          ))}
        </div>

        {!visibleCategories.length && (
          <p className="mt-8 text-gray-500">No care categories match "{String(searchQuery || "").trim()}".</p>
        )}
      </div>
    </section>
  );
}

export default CareCategoriesSection;
