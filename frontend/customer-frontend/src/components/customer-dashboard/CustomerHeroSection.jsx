import React from "react";

function CustomerHeroSection({ userName = "Customer", hasSubscription = false, onCtaClick }) {
  const ctaLabel = hasSubscription ? "View My Plan" : "Explore Care Plans";

  return (
    <section className="w-full bg-[#f8f7f4]">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="space-y-6">
          <p className="text-lg font-medium text-gray-500">Good evening, {userName}.</p>

          <h1 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            Your home is in good hands.
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-gray-500">
            We manage the details, so you can enjoy the comfort.
          </p>

          <button
            type="button"
            onClick={onCtaClick}
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition duration-300 hover:bg-black"
          >
            {ctaLabel}
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl shadow-sm">
          <img
            src="https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1600&q=80"
            alt="Warm and elegant home interior"
            loading="lazy"
            className="h-[320px] w-full object-cover transition-all duration-500 hover:scale-105 sm:h-[420px]"
          />
        </div>
      </div>
    </section>
  );
}

export default CustomerHeroSection;

