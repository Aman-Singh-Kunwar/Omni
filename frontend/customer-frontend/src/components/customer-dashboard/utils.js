import { SERVICE_PRICE_MAX, SERVICE_PRICE_MIN, SERVICE_PRICE_STEP } from "./constants";

function hashServiceName(name) {
  return Array.from(String(name || "")).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
}

function getRandomServicePrice(serviceName) {
  const stepCount = Math.floor((SERVICE_PRICE_MAX - SERVICE_PRICE_MIN) / SERVICE_PRICE_STEP) + 1;
  const offset = hashServiceName(serviceName) % stepCount;
  return SERVICE_PRICE_MIN + offset * SERVICE_PRICE_STEP;
}

function formatInr(amount) {
  return `INR ${Number(amount || 0).toLocaleString("en-IN")}`;
}

function toFavoriteProvider(provider = {}) {
  const id = String(provider.id || "").trim();
  if (!id) {
    return null;
  }

  const name = String(provider.name || "Worker").trim() || "Worker";
  const servicesProvided = Array.isArray(provider.servicesProvided)
    ? provider.servicesProvided.map((service) => String(service || "").trim()).filter(Boolean)
    : [];
  const service = String(provider.service || servicesProvided[0] || "General Service").trim() || "General Service";
  const numericRating = Number(provider.rating || 0);
  const numericReviews = Number(provider.reviews || 0);
  const fallbackImage = name
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id,
    name,
    service,
    servicesProvided,
    rating: Number.isFinite(numericRating) ? numericRating : 0,
    reviews: Number.isFinite(numericReviews) ? numericReviews : 0,
    image: String(provider.image || fallbackImage || "W")
      .slice(0, 2)
      .toUpperCase()
  };
}

export { formatInr, getRandomServicePrice, toFavoriteProvider };
