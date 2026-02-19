import express from "express";
import {
  bcrypt,
  logger,
  requireAuth,
  syncUserFamilyByEmail
} from "./shared.js";

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

router.post("/auth/delete-account", requireAuth, async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (!username || !password) {
      logger.warn("Delete account failed: missing fields", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(400).json({ message: "Username and password are required." });
    }

    if (username !== String(req.authUser.name || "").trim()) {
      logger.warn("Delete account failed: username mismatch", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(401).json({ message: "Username does not match this account." });
    }

    const validPassword = await bcrypt.compare(password, req.authUser.passwordHash);
    if (!validPassword) {
      logger.warn("Delete account failed: invalid password", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(401).json({ message: "Invalid password." });
    }

    const revokedPasswordHash = await bcrypt.hash(`deleted-${String(req.authUser._id)}-${Date.now()}`, 10);

    req.authUser.passwordHash = revokedPasswordHash;
    req.authUser.deletedCredentialsAt = new Date();
    req.authUser.lastLoginAt = null;
    if (req.authUser.role === "worker") {
      if (!req.authUser.workerProfile) {
        req.authUser.workerProfile = {};
      }
      // Deleted workers should not appear in provider lists and counts.
      req.authUser.workerProfile.isAvailable = false;
    }
    await req.authUser.save();
    logger.info("Account credentials deleted", {
      userId: String(req.authUser._id),
      email: req.authUser.email,
      role: req.authUser.role
    });

    return res.json({
      message: "Account credentials deleted. Please sign up again to regain access."
    });
  } catch (error) {
    logger.error("Delete account failed", {
      userId: String(req.authUser?._id || ""),
      role: req.authUser?.role,
      message: error?.message || "Unknown error"
    });
    return next(error);
  }
});

router.post("/auth/logout", requireAuth, async (req, res, next) => {
  try {
    logger.info("Logout successful", {
      userId: String(req.authUser._id),
      email: req.authUser.email,
      role: req.authUser.role
    });
    return res.json({ message: "Logged out successfully." });
  } catch (error) {
    logger.error("Login failed with exception", {
      email: String(req.body?.email || "").trim().toLowerCase(),
      role: String(req.body?.role || "").trim(),
      message: error?.message || "Unknown login error"
    });
    return next(error);
  }
});

export default router;
