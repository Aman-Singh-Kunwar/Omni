import express from "express";
import {
  PROFILE_PATH_BY_ROLE,
  buildProfileUpdate,
  enrichWorkerProfile,
  getWorkerBrokerCommissionProgress,
  logger,
  requireAuth,
  safeNormalizeBrokerCode,
  syncUserFamilyByEmail,
  toAuthUser,
  toProfileDto
} from "./shared.js";

const router = express.Router();

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
      logger.warn("Profile update failed: direct email change blocked", {
        userId: String(req.authUser._id),
        role: req.authUser.role
      });
      return res.status(409).json({ message: "Use email verification to update your email address." });
    }

    const roleProfilePath = PROFILE_PATH_BY_ROLE[req.authUser.role];
    if (!roleProfilePath) {
      logger.warn("Profile update failed: unsupported role profile", {
        userId: String(req.authUser._id),
        role: req.authUser.role
      });
      return res.status(400).json({ message: "Unsupported role profile." });
    }

    const updates = buildProfileUpdate(req.authUser.role, payload);

    if (req.authUser.role === "worker") {
      const existingBrokerCode = safeNormalizeBrokerCode(req.authUser.workerProfile?.brokerCode);
      const existingBrokerId = req.authUser.workerProfile?.brokerId ? String(req.authUser.workerProfile.brokerId) : "";
      const requestedBrokerCode = safeNormalizeBrokerCode(payload.brokerCode);
      const hasBrokerCodeInPayload = Object.prototype.hasOwnProperty.call(payload, "brokerCode");

      if (hasBrokerCodeInPayload && requestedBrokerCode !== existingBrokerCode) {
        logger.warn("Profile update failed: broker code edit not allowed", {
          userId: String(req.authUser._id),
          role: req.authUser.role
        });
        return res.status(409).json({ message: "Broker code can only be set during worker signup." });
      }

      updates.brokerCode = existingBrokerCode;
      updates.brokerId = existingBrokerId || undefined;
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
    logger.info("Profile updated successfully", {
      userId: String(req.authUser._id),
      role: req.authUser.role,
      emailChanged: oldEmail !== req.authUser.email
    });

    return res.json({
      ...payloadResponse,
      user: toAuthUser(req.authUser)
    });
  } catch (error) {
    if (error.statusCode) {
      logger.warn("Profile update failed", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role,
        statusCode: error.statusCode,
        message: error.message
      });
      return res.status(error.statusCode).json({ message: error.message });
    }
    logger.error("Profile update failed", {
      userId: String(req.authUser?._id || ""),
      role: req.authUser?.role,
      message: error?.message || "Unknown profile update error"
    });
    return next(error);
  }
});

export default router;
