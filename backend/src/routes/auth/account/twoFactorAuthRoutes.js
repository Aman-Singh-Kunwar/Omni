import express from "express";
import { logger, requireAuth, toAuthUser } from "../shared.js";

const router = express.Router();

// Toggle 2FA on/off
router.put("/auth/two-factor-auth", requireAuth, async (req, res, next) => {
  try {
    const enable = req.body?.enable;

    if (typeof enable !== "boolean") {
      logger.warn("2FA update failed: invalid enable value", {
        userId: String(req.authUser._id),
        role: req.authUser.role
      });
      return res.status(400).json({ message: "Enable parameter must be a boolean." });
    }

    req.authUser.twoFactorAuth.twoFactorAuthEnabled = enable;
    
    // Clear any pending OTP when disabling 2FA
    if (!enable) {
      req.authUser.twoFactorAuth.otpCode = null;
      req.authUser.twoFactorAuth.otpExpiresAt = null;
    }

    await req.authUser.save();

    logger.info("2FA setting updated", {
      userId: String(req.authUser._id),
      role: req.authUser.role,
      enabled: enable
    });

    return res.json({
      user: toAuthUser(req.authUser),
      message: `Two-factor authentication has been ${enable ? "enabled" : "disabled"}.`
    });
  } catch (error) {
    logger.error("2FA update failed", {
      userId: String(req.authUser?._id || ""),
      role: req.authUser?.role,
      message: error?.message || "Unknown 2FA update error"
    });
    return next(error);
  }
});

// Get 2FA status
router.get("/auth/two-factor-auth/status", requireAuth, async (req, res, next) => {
  try {
    return res.json({
      twoFactorAuthEnabled: req.authUser.twoFactorAuth?.twoFactorAuthEnabled || false
    });
  } catch (error) {
    logger.error("2FA status fetch failed", {
      userId: String(req.authUser?._id || ""),
      role: req.authUser?.role,
      message: error?.message || "Unknown error"
    });
    return next(error);
  }
});

export default router;
