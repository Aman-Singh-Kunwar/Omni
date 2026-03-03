import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const HERO_SLIDES = [
  {
    id: "home-care",
    eyebrow: "Home Care",
    title: "Your home is in good hands.",
    description: "Trusted experts for cleaning, repairs, and daily comfort services at your doorstep.",
    cta: "Explore Home Care",
    imageUrl: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Warm and elegant home interior"
  },
  {
    id: "personal-grooming",
    eyebrow: "Personal Grooming",
    title: "Look fresh without stepping out.",
    description: "Book salon and grooming professionals for beauty, styling, and self-care at home.",
    cta: "Explore Personal Grooming",
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Personal grooming and beauty service setup"
  }
];

function CustomerHeroSection({ userName = "Customer", hasSubscription = false, onCtaClick }) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const currentSlide = HERO_SLIDES[activeSlideIndex] || HERO_SLIDES[0];
  const totalSlides = HERO_SLIDES.length;

  useEffect(() => {
    if (totalSlides < 2) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [totalSlides]);

  const manualCtaLabel = useMemo(() => {
    if (hasSubscription) {
      return "View My Plan";
    }
    return currentSlide.cta || "Explore Care Plans";
  }, [currentSlide.cta, hasSubscription]);

  const goPrevSlide = () => {
    setActiveSlideIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goNextSlide = () => {
    setActiveSlideIndex((prev) => (prev + 1) % totalSlides);
  };

  return (
    <section className="relative mb-8 w-full rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
      <button
        type="button"
        onClick={goPrevSlide}
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/70"
        aria-label="Show previous hero slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={goNextSlide}
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/70"
        aria-label="Show next hero slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="mx-auto grid max-w-7xl items-center gap-8 px-10 py-12 sm:px-12 lg:grid-cols-2 lg:px-16">
        <div className="space-y-6">
          <p className="text-lg font-medium text-gray-500">
            Good evening, {userName}.{" "}
          </p>

          <h1 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            {currentSlide.title}
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-gray-500">
            {currentSlide.description}
          </p>

          <button
            type="button"
            onClick={() => onCtaClick?.(currentSlide.id)}
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition duration-300 hover:bg-black"
          >
            {manualCtaLabel}
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl shadow-sm">
          <img
            src={currentSlide.imageUrl}
            alt={currentSlide.imageAlt}
            loading="lazy"
            className="h-[320px] w-full object-cover transition-all duration-700 sm:h-[420px]"
          />

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2 py-1">
            {HERO_SLIDES.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveSlideIndex(index)}
                aria-label={`Show ${slide.eyebrow} slide`}
                className={`h-2 w-2 rounded-full transition ${index === activeSlideIndex ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CustomerHeroSection;
