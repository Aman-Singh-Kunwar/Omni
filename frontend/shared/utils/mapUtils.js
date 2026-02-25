// Shared map/routing utilities used by LiveTrackingModal and CustomerLocationModal.
// Keep this file free of React/Leaflet imports so it can be tested in isolation.

/**
 * Haversine great-circle distance between two {lat, lng} points, in kilometres.
 */
export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Returns a traffic multiplier based on the current hour of day.
 * Peak hours (morning/evening rush) get higher multipliers.
 */
function getTrafficMultiplier() {
  const hour = new Date().getHours();
  if (hour < 6)  return 1.1; // Late night — light traffic
  if (hour < 8)  return 1.3; // Early morning — building up
  if (hour < 10) return 1.7; // Morning peak
  if (hour < 17) return 1.4; // Midday
  if (hour < 20) return 1.8; // Evening peak
  if (hour < 22) return 1.3; // Evening
  return 1.2;                // Late evening
}

/**
 * Format a raw duration in seconds as a human-readable ETA string,
 * adjusted for typical time-of-day traffic conditions.
 */
export function formatEtaDuration(seconds) {
  const adjusted = Math.round(seconds * getTrafficMultiplier());
  const minutes = Math.round(adjusted / 60);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return minutes === 1 ? "1 min" : `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return hours === 1 ? "1 hr" : `${hours} hrs`;
  return `${hours} hr ${mins} min`;
}

/**
 * Format a distance in km as a human-readable ETA string,
 * assuming 30 km/h base speed adjusted for time-of-day traffic.
 */
export function formatEta(km) {
  return formatEtaDuration((km / 30) * 3600);
}

/**
 * Fetch a driving route from OSRM between two {lat, lng} points.
 * Returns { coords, durationSeconds } where coords is an array of [lat, lng]
 * pairs for use with react-leaflet Polyline, and durationSeconds is the raw
 * OSRM travel time estimate (before traffic adjustment).
 * Returns null if the route could not be fetched.
 *
 * Accepts an optional AbortSignal so callers can cancel stale requests.
 */
export async function fetchOsrmRoute(from, to, signal) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson`;
  const res = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(8000)
  });
  const data = await res.json();
  const coords = data?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const durationSeconds = data?.routes?.[0]?.duration ?? null;
  // OSRM returns [lng, lat]; Leaflet expects [lat, lng]
  return { coords: coords.map(([lng, lat]) => [lat, lng]), durationSeconds };
}

/**
 * Geocode a text address with Nominatim using fully-parallel queries.
 * All comma-split sub-strings are sent simultaneously; the most specific
 * result (fewest segments stripped) whose bounding box is < 50 km wins.
 *
 * e.g. "House 5, Green Park, Dehradun" fires all at once:
 *   q[0] = "House 5, Green Park, Dehradun"
 *   q[1] = "Green Park, Dehradun"
 *   q[2] = "Dehradun"
 * Returns the lowest-index result with radius < MAX_RADIUS_M, or null.
 *
 * Results are cached for the session lifetime so re-opening the same
 * booking's tracking modal is instant on subsequent opens.
 */
const MAX_RADIUS_M = 50_000;
const _geocodeCache = new Map();

async function _fetchSingleGeocode(q, index) {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
    `&format=json&limit=1&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "en" },
    signal: AbortSignal.timeout(6000)
  });
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return null;

  const { lat, lon, boundingbox } = data[0];
  const centerLat = parseFloat(lat);
  const centerLng = parseFloat(lon);
  const [s, n, w, e] = boundingbox.map(parseFloat);
  const R = 6371000;
  const latRadius = (R * Math.abs(n - s) * Math.PI) / 180 / 2;
  const lngRadius =
    (R * Math.abs(e - w) * Math.PI) / 180 / 2 *
    Math.cos((centerLat * Math.PI) / 180);
  const radius = Math.max(200, Math.max(latRadius, lngRadius));

  if (radius >= MAX_RADIUS_M) return null;
  return { index, result: { lat: centerLat, lng: centerLng, radius } };
}

export async function fetchGeocode(addressText) {
  const cacheKey = addressText.trim().toLowerCase();
  if (_geocodeCache.has(cacheKey)) return _geocodeCache.get(cacheKey);

  try {
    const parts = addressText.split(",").map((s) => s.trim()).filter(Boolean);
    const queries = parts.map((_, i) => parts.slice(i).join(", "));

    // Fire all queries in parallel — total wait = slowest single request,
    // not the sum of all requests.
    const settled = await Promise.allSettled(
      queries.map((q, i) => _fetchSingleGeocode(q, i))
    );

    // Collect successful, valid results and pick the most specific (lowest index).
    const best = settled
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => r.value)
      .sort((a, b) => a.index - b.index)[0]?.result ?? null;

    _geocodeCache.set(cacheKey, best);
    return best;
  } catch {
    return null;
  }
}
