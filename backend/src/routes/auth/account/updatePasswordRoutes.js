import express from "express";
import { bcrypt, logger, requireAuth, syncUserFamilyByEmail } from "../shared.js";

const router = express.Router();

router.post("/auth/update-password", requireAuth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      logger.warn("Update password failed: missing fields", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(400).json({ message: "Current password and new password are required." });
    }
    if (newPassword.length < 6) {
      logger.warn("Update password failed: short password", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }
    if (req.authUser.deletedCredentialsAt) {
      logger.warn("Update password failed: credentials deleted", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(403).json({ message: "Account credentials deleted. Please sign up again to regain access." });
    }

    const validCurrentPassword = await bcrypt.compare(currentPassword, req.authUser.passwordHash);
    if (!validCurrentPassword) {
      logger.warn("Update password failed: invalid current password", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const isSamePassword = await bcrypt.compare(newPassword, req.authUser.passwordHash);
    if (isSamePassword) {
      logger.warn("Update password failed: same password", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(409).json({ message: "New password must be different from current password." });
    }

    req.authUser.passwordHash = await bcrypt.hash(newPassword, 10);
    await req.authUser.save();
    await syncUserFamilyByEmail(req.authUser);
    logger.info("Password updated successfully", {
      userId: String(req.authUser._id),
      email: req.authUser.email,
      role: req.authUser.role
    });

    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    logger.error("Update password failed", {
      userId: String(req.authUser?._id || ""),
      role: req.authUser?.role,
      message: error?.message || "Unknown error"
    });
    return next(error);
  }
});

export default router;
