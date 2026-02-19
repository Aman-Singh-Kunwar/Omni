import express from "express";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  logger,
  normalizeNotificationSettings,
  requireAuth
} from "./shared.js";

const router = express.Router();

router.put("/profile/notifications", requireAuth, async (req, res, next) => {
  try {
    const updates = normalizeNotificationSettings(req.body || {});
    req.authUser.notificationSettings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...(req.authUser.notificationSettings || {}),
      ...updates
    };
    await req.authUser.save();

    logger.info("Notification settings updated", {
      userId: String(req.authUser._id),
      role: req.authUser.role
    });

    return res.json({ notificationSettings: req.authUser.notificationSettings });
  } catch (error) {
    if (error.statusCode) {
      logger.warn("Notification settings update failed", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role,
        statusCode: error.statusCode,
        message: error.message
      });
      return res.status(error.statusCode).json({ message: error.message });
    }

    logger.error("Notification settings update failed", {
      userId: String(req.authUser?._id || ""),
      role: req.authUser?.role,
      message: error?.message || "Unknown notification settings error"
    });
    return next(error);
  }
});

export default router;
