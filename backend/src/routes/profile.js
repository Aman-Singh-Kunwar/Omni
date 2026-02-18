import express from "express";
import User from "../models/User.js";
import { PROFILE_PATH_BY_ROLE, buildProfileUpdate, toProfileDto } from "../schemas/profile.js";
import {
  findBrokerByCode,
  getLinkedBrokerForWorker,
  getWorkerBrokerCommissionProgress,
  requireAuth,
  safeNormalizeBrokerCode,
  toAuthUser
} from "./helpers.js";
import { normalizeEmail, syncUserFamilyByEmail } from "../utils/userSync.js";
const router = express.Router();

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

router.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const payload = toProfileDto(req.authUser);
    if (req.authUser.role === "worker") {
      const enrichedProfile = await enrichWorkerProfile(req.authUser, payload.profile);
      const progress = await getWorkerBrokerCommissionProgress(req.authUser);
      payload.profile = {
        ...enrichedProfile,
        brokerCommissionJobsUsed: progress.usedJobs,
        brokerCommissionJobsLimit: progress.jobLimit,
        brokerCommissionUsage: progress.usageLabel
      };
    }
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const oldEmail = req.authUser.email;
    const payload = req.body || {};
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

    if (name) {
      req.authUser.name = name;
    }

    if (email && email !== req.authUser.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      const existing = await User.findOne({ email, role: req.authUser.role }).select({ _id: 1 }).lean();
      if (existing && String(existing._id) !== String(req.authUser._id)) {
        return res.status(409).json({ message: "Email already registered for this role." });
      }

      await ensureEmailCanMoveForFamily(req.authUser, email);

      req.authUser.email = email;
    }

    const roleProfilePath = PROFILE_PATH_BY_ROLE[req.authUser.role];
    if (!roleProfilePath) {
      return res.status(400).json({ message: "Unsupported role profile." });
    }

    const updates = buildProfileUpdate(req.authUser.role, payload);

    if (req.authUser.role === "worker") {
      const existingBrokerCode = safeNormalizeBrokerCode(req.authUser.workerProfile?.brokerCode);
      const existingBrokerId = req.authUser.workerProfile?.brokerId ? String(req.authUser.workerProfile.brokerId) : "";
      const requestedBrokerCode = safeNormalizeBrokerCode(updates.brokerCode);
      const hasExistingBrokerLink = Boolean(existingBrokerCode || existingBrokerId);

      if (existingBrokerCode && requestedBrokerCode && requestedBrokerCode !== existingBrokerCode) {
        return res.status(409).json({ message: "Broker code cannot be edited once linked." });
      }

      if (hasExistingBrokerLink) {
        if (existingBrokerId && requestedBrokerCode && !existingBrokerCode) {
          const requestedBroker = await findBrokerByCode(requestedBrokerCode);
          if (!requestedBroker || String(requestedBroker.id) !== existingBrokerId) {
            return res.status(409).json({ message: "Broker code cannot be edited once linked." });
          }
          updates.brokerCode = requestedBroker.code;
          updates.brokerId = existingBrokerId;
        } else {
          updates.brokerCode = existingBrokerCode || updates.brokerCode || "";
          updates.brokerId = existingBrokerId || req.authUser.workerProfile?.brokerId;
        }
      } else if (requestedBrokerCode) {
        const linkedBroker = await findBrokerByCode(requestedBrokerCode);
        if (!linkedBroker) {
          return res.status(404).json({ message: "Broker not found for the provided broker code." });
        }
        updates.brokerCode = linkedBroker.code;
        updates.brokerId = linkedBroker.id;
      } else if (existingBrokerCode) {
        updates.brokerCode = existingBrokerCode;
        updates.brokerId = req.authUser.workerProfile?.brokerId;
      } else {
        updates.brokerCode = "";
        updates.brokerId = undefined;
      }
    }

    if (!req.authUser[roleProfilePath]) {
      req.authUser[roleProfilePath] = {};
    }

    Object.entries(updates).forEach(([key, value]) => {
      req.authUser[roleProfilePath][key] = value;
    });

    await req.authUser.save();
    await syncUserFamilyByEmail(req.authUser, { oldEmail });

    const payloadResponse = toProfileDto(req.authUser);
    if (req.authUser.role === "worker") {
      const enrichedProfile = await enrichWorkerProfile(req.authUser, payloadResponse.profile);
      const progress = await getWorkerBrokerCommissionProgress(req.authUser);
      payloadResponse.profile = {
        ...enrichedProfile,
        brokerCommissionJobsUsed: progress.usedJobs,
        brokerCommissionJobsLimit: progress.jobLimit,
        brokerCommissionUsage: progress.usageLabel
      };
    }

    return res.json({
      ...payloadResponse,
      user: toAuthUser(req.authUser)
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
});

export default router;
