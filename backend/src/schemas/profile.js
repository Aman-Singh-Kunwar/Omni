import { normalizeServices as normalizeCatalogServices } from "../config/serviceCatalog.js";

const GENDER_VALUES = ["male", "female", "prefer_not_to_say", "other"];
const BROKER_CODE_REGEX = /^[A-Z0-9]{6}$/;
const PHONE_REGEX = /^\d{10,13}$/;
const PROFILE_PHOTO_DATA_URL_REGEX = /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i;
const PROFILE_PHOTO_MAX_BYTES = 400 * 1024;

const PROFILE_PATH_BY_ROLE = {
  customer: "customerProfile",
  broker: "brokerProfile",
  worker: "workerProfile"
};

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizePhone(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }

  if (!PHONE_REGEX.test(normalized)) {
    const error = new Error("Phone number must be 10 to 13 digits.");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function normalizeGender(value) {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) {
    return "";
  }
  return GENDER_VALUES.includes(normalized) ? normalized : null;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function calculateAgeYears(dateOfBirth, referenceDate = new Date()) {
  const birth = new Date(dateOfBirth);
  const reference = new Date(referenceDate);

  let years = reference.getFullYear() - birth.getFullYear();
  const monthDelta = reference.getMonth() - birth.getMonth();
  const hasBirthdayPassed = monthDelta > 0 || (monthDelta === 0 && reference.getDate() >= birth.getDate());
  if (!hasBirthdayPassed) {
    years -= 1;
  }
  return years;
}

function validateDateOfBirthForRole(role, dateOfBirth) {
  const age = calculateAgeYears(dateOfBirth);
  if (!Number.isFinite(age) || age < 0) {
    const error = new Error("Invalid dateOfBirth value.");
    error.statusCode = 400;
    throw error;
  }

  if ((role === "worker" || role === "broker") && (age < 18 || age > 60)) {
    const error = new Error("Worker and broker age must be between 18 and 60 years.");
    error.statusCode = 400;
    throw error;
  }

  if (role === "customer" && age <= 10) {
    const error = new Error("Customer must be older than 10 years.");
    error.statusCode = 400;
    throw error;
  }
}

function normalizeServices(value) {
  return normalizeCatalogServices(value);
}

function normalizeBrokerCode(value) {
  if (value === undefined || value === null) {
    return "";
  }

  const normalized = String(value).trim().toUpperCase();
  if (!normalized) {
    return "";
  }

  if (!BROKER_CODE_REGEX.test(normalized)) {
    const error = new Error("Broker code must be exactly 6 letters/numbers.");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function estimateBase64Bytes(base64Payload = "") {
  const normalized = String(base64Payload || "").replace(/\s+/g, "");
  if (!normalized) {
    return 0;
  }

  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function normalizePhotoUrl(value) {
  if (value === undefined || value === null) {
    return "";
  }

  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }

  if (!PROFILE_PHOTO_DATA_URL_REGEX.test(normalized)) {
    const error = new Error("Profile photo must be a valid PNG/JPG/WEBP image.");
    error.statusCode = 400;
    throw error;
  }

  const base64Part = normalized.split(",")[1] || "";
  const estimatedBytes = estimateBase64Bytes(base64Part);
  if (estimatedBytes > PROFILE_PHOTO_MAX_BYTES) {
    const error = new Error("Profile photo must be 400KB or less after compression.");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function pickRoleProfile(user) {
  const path = PROFILE_PATH_BY_ROLE[user.role];
  return user[path] || {};
}

function resolvePhotoUrlFromUser(user, preferredPath = "") {
  const orderedPaths = [...new Set([preferredPath, "workerProfile", "brokerProfile", "customerProfile"].filter(Boolean))];
  for (const path of orderedPaths) {
    const profile = user?.[path] || {};
    const photoUrl = normalizeString(profile?.photoUrl);
    if (photoUrl) {
      return photoUrl;
    }
  }
  return "";
}

function toProfileDto(user) {
  const profilePath = PROFILE_PATH_BY_ROLE[user.role];
  const roleProfile = pickRoleProfile(user);
  const commonProfile = {
    bio: roleProfile.bio || "",
    gender: roleProfile.gender || "",
    dateOfBirth: roleProfile.dateOfBirth || null,
    phone: roleProfile.phone || "",
    photoUrl: resolvePhotoUrlFromUser(user, profilePath)
  };

  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified !== false,
      role: user.role
    },
    profile:
      user.role === "worker"
        ? {
            ...commonProfile,
            servicesProvided: Array.isArray(roleProfile.servicesProvided) ? roleProfile.servicesProvided : [],
            isAvailable: Boolean(roleProfile.isAvailable),
            brokerCode: roleProfile.brokerCode || "",
            brokerCodeLocked: Boolean(roleProfile.brokerCode || roleProfile.brokerId)
          }
        : user.role === "broker"
          ? {
              ...commonProfile,
              brokerCode: roleProfile.brokerCode || ""
            }
        : commonProfile
  };
}

function buildProfileUpdate(role, payload = {}) {
  const updates = {
    bio: normalizeString(payload.bio),
    phone: normalizePhone(payload.phone)
  };
  if (Object.prototype.hasOwnProperty.call(payload, "photoUrl")) {
    updates.photoUrl = normalizePhotoUrl(payload.photoUrl);
  }

  const gender = normalizeGender(payload.gender);
  if (gender === null) {
    const error = new Error("Invalid gender value.");
    error.statusCode = 400;
    throw error;
  }
  updates.gender = gender;

  if (payload.dateOfBirth) {
    const dateOfBirth = normalizeDate(payload.dateOfBirth);
    if (!dateOfBirth) {
      const error = new Error("Invalid dateOfBirth value.");
      error.statusCode = 400;
      throw error;
    }
    validateDateOfBirthForRole(role, dateOfBirth);
    updates.dateOfBirth = dateOfBirth;
  } else {
    updates.dateOfBirth = undefined;
  }

  if (role === "worker") {
    updates.servicesProvided = normalizeServices(payload.servicesProvided);
    if (typeof payload.isAvailable === "boolean") {
      updates.isAvailable = payload.isAvailable;
    }
    updates.brokerCode = normalizeBrokerCode(payload.brokerCode);
  }

  return updates;
}

function toAvailableWorkerDto(user, bookingSummary = { completedJobs: 0, averageRating: 0 }) {
  const workerProfile = user.workerProfile || {};
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    bio: workerProfile.bio || "",
    phone: workerProfile.phone || "",
    gender: workerProfile.gender || "",
    dateOfBirth: workerProfile.dateOfBirth || null,
    photoUrl: resolvePhotoUrlFromUser(user, "workerProfile"),
    servicesProvided: Array.isArray(workerProfile.servicesProvided) ? workerProfile.servicesProvided : [],
    isAvailable: workerProfile.isAvailable !== false,
    completedJobs: bookingSummary.completedJobs,
    averageRating: bookingSummary.averageRating
  };
}

export {
  PROFILE_PATH_BY_ROLE,
  toProfileDto,
  buildProfileUpdate,
  toAvailableWorkerDto,
  resolvePhotoUrlFromUser,
  normalizeBrokerCode
};
