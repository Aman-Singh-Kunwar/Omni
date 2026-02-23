function toCoordinateLabel(position) {
  if (!position) {
    return "";
  }

  return `${Number(position.lat).toFixed(5)}, ${Number(position.lng).toFixed(5)}`;
}

function deriveAddressLabel(result, fallbackPosition) {
  if (!result || typeof result !== "object") {
    return toCoordinateLabel(fallbackPosition);
  }

  const address = result.address || {};
  const compactLabel = [
    address.road,
    address.suburb || address.neighbourhood,
    address.city || address.town || address.village || address.county,
    address.state
  ]
    .filter(Boolean)
    .join(", ");

  if (compactLabel) {
    return compactLabel;
  }
  if (result.display_name) {
    return String(result.display_name);
  }

  return toCoordinateLabel(fallbackPosition);
}

function normalizePosition(position) {
  const lat = Number(position?.lat);
  const lng = Number(position?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function toSearchResult(item) {
  const lat = Number(item?.lat);
  const lng = Number(item?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const label = String(item?.display_name || "").trim();
  return {
    lat,
    lng,
    label: label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  };
}

export { toCoordinateLabel, deriveAddressLabel, normalizePosition, toSearchResult };
