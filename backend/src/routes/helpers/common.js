import { normalizeBrokerCode } from "../../schemas/profile.js";

function normalizeForCompare(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function safeNormalizeBrokerCode(value) {
  try {
    return normalizeBrokerCode(value);
  } catch (_error) {
    return "";
  }
}

function isLikelyObjectId(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value || ""));
}

export { isLikelyObjectId, normalizeForCompare, safeNormalizeBrokerCode };
