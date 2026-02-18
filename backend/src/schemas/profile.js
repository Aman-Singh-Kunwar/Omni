const GENDER_VALUES = ["male", "female", "non-binary", "prefer_not_to_say", "other"];
const BROKER_CODE_REGEX = /^[A-Z0-9]{6}$/;

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

function normalizeServices(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(normalizeString).filter(Boolean))];
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

function pickRoleProfile(user) {
  const path = PROFILE_PATH_BY_ROLE[user.role];
  return user[path] || {};
}

function toProfileDto(user) {
  const roleProfile = pickRoleProfile(user);
  const commonProfile = {
    bio: roleProfile.bio || "",
    gender: roleProfile.gender || "",
    dateOfBirth: roleProfile.dateOfBirth || null,
    phone: roleProfile.phone || ""
  };

  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
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
    phone: normalizeString(payload.phone)
  };

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
  normalizeBrokerCode
};
