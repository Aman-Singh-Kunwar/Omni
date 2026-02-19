function toStableId(value, fallback = "") {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object") {
    if (typeof value.$oid === "string") {
      return value.$oid;
    }
    if (typeof value.id === "string" || typeof value.id === "number") {
      return String(value.id);
    }
    if (typeof value._id === "string" || typeof value._id === "number") {
      return String(value._id);
    }
    if (typeof value.toString === "function") {
      const next = value.toString();
      if (next && next !== "[object Object]") {
        return next;
      }
    }
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return String(fallback || "");
    }
  }

  return String(fallback || "");
}

function toShortErrorMessage(value, fallback) {
  const message = String(value || fallback || "").trim();
  if (!message) {
    return fallback;
  }
  return message.length > 90 ? `${message.slice(0, 87)}...` : message;
}

function toBooleanOrDefault(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

export { toStableId, toShortErrorMessage, toBooleanOrDefault };
