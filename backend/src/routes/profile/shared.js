import User from "../../models/User.js";
import { PROFILE_PATH_BY_ROLE, buildProfileUpdate, toProfileDto } from "../../schemas/profile.js";
import {
  getLinkedBrokerForWorker,
  getWorkerBrokerCommissionProgress,
  requireAuth,
  safeNormalizeBrokerCode,
  toAuthUser
} from "../helpers.js";
import logger from "../../utils/logger.js";
import { normalizeEmail, syncUserFamilyByEmail } from "../../utils/userSync.js";

const DEFAULT_NOTIFICATION_SETTINGS = {
  notificationsEnabled: true,
  jobRequests: true,
  payments: true,
  jobAlerts: true,
  reminders: false
};

function normalizeNotificationSettings(payload = {}) {
  const next = {};
  for (const key of Object.keys(DEFAULT_NOTIFICATION_SETTINGS)) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      if (typeof payload[key] !== "boolean") {
        const error = new Error(`Invalid notification setting: ${key}`);
        error.statusCode = 400;
        throw error;
      }
      next[key] = payload[key];
    }
  }

  if (!Object.keys(next).length) {
    const error = new Error("At least one notification setting is required.");
    error.statusCode = 400;
    throw error;
  }

  return next;
}

function isGmailAddress(value) {
  return /^[a-z0-9._%+-]+@gmail\.com$/.test(String(value || "").trim().toLowerCase());
}

async function enrichWorkerProfile(user, profile = {}) {
  const linkedBroker = await getLinkedBrokerForWorker(user);
  const brokerCode = profile.brokerCode || linkedBroker?.code || "";
  const brokerId = linkedBroker?.id ? String(linkedBroker.id) : user?.workerProfile?.brokerId ? String(user.workerProfile.brokerId) : "";
  const brokerName = linkedBroker?.name || "";
  return {
    ...profile,
    brokerCode,
    brokerId,
    brokerName,
    brokerCodeLocked: Boolean(brokerCode || brokerId)
  };
}

async function ensureEmailCanMoveForFamily(currentUser, nextEmail) {
  const currentEmail = normalizeEmail(currentUser?.email);
  const targetEmail = normalizeEmail(nextEmail);
  if (!currentEmail || !targetEmail || currentEmail === targetEmail) {
    return;
  }

  const family = await User.find({ email: currentEmail }).select({ _id: 1, role: 1 }).lean();
  const familyIds = new Set(family.map((item) => String(item._id)));
  familyIds.add(String(currentUser._id));
  const familyRoles = [...new Set(family.map((item) => item.role).filter(Boolean))];
  if (!familyRoles.includes(currentUser.role)) {
    familyRoles.push(currentUser.role);
  }

  const conflicts = await User.find({
    email: targetEmail,
    role: { $in: familyRoles },
    _id: { $nin: [...familyIds] }
  })
    .select({ _id: 1, role: 1 })
    .lean();

  if (conflicts.length) {
    const error = new Error("Email already registered for this role.");
    error.statusCode = 409;
    throw error;
  }
}

export {
  DEFAULT_NOTIFICATION_SETTINGS,
  PROFILE_PATH_BY_ROLE,
  buildProfileUpdate,
  enrichWorkerProfile,
  ensureEmailCanMoveForFamily,
  getWorkerBrokerCommissionProgress,
  isGmailAddress,
  logger,
  normalizeNotificationSettings,
  requireAuth,
  safeNormalizeBrokerCode,
  syncUserFamilyByEmail,
  toAuthUser,
  toProfileDto,
  User
};
