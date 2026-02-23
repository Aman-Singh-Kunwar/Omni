import express from "express";
import { sendMail } from "../../../utils/mailer.js";
import { bcrypt, logger, requireAuth } from "../shared.js";
import { buildAccountDeletionEmail } from "./emailTemplates.js";

const router = express.Router();

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

    try {
      const emailContent = buildAccountDeletionEmail(req.authUser.name, req.authUser.role);
      await sendMail({
        to: req.authUser.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      });
    } catch (emailError) {
      logger.warn("Account deletion email failed", {
        userId: String(req.authUser._id),
        email: req.authUser.email,
        role: req.authUser.role,
        message: emailError?.message || "Unknown account deletion email error"
      });
    }

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

export default router;
