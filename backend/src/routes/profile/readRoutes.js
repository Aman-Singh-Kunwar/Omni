import express from "express";
import {
  enrichWorkerProfile,
  getWorkerBrokerCommissionProgress,
  logger,
  requireAuth,
  toProfileDto
} from "./shared.js";

const router = express.Router();

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
    logger.error("Get profile failed", {
      userId: String(req.authUser?._id || ""),
      role: req.authUser?.role,
      message: error?.message || "Unknown get profile error"
    });
    return next(error);
  }
});

export default router;
