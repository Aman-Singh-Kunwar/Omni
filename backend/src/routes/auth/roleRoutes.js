import express from "express";
import {
  User,
  ensureBrokerCodeForUser,
  generateUniqueBrokerCode,
  isGmailAddress,
  logger,
  requireAuth,
  signToken,
  syncUserFamilyByEmail,
  toAuthUser
} from "./shared.js";

const router = express.Router();

router.post("/auth/switch-role", requireAuth, async (req, res, next) => {
  try {
    const targetRole = String(req.body?.role || "")
      .trim()
      .toLowerCase();

    if (!["customer", "broker", "worker"].includes(targetRole)) {
      logger.warn("Switch role failed: invalid role", {
        userId: String(req.authUser._id),
        fromRole: req.authUser.role,
        targetRole
      });
      return res.status(400).json({ message: "Invalid role." });
    }

    if (targetRole === req.authUser.role) {
      const token = signToken(req.authUser);
      return res.json({
        user: toAuthUser(req.authUser),
        token
      });
    }

    let targetUser = await User.findOne({ email: req.authUser.email, role: targetRole });
    if (!targetUser) {
      if (!isGmailAddress(req.authUser.email)) {
        return res.status(400).json({ message: "Only @gmail.com email addresses are allowed." });
      }
      const createPayload = {
        name: req.authUser.name,
        email: req.authUser.email,
        passwordHash: req.authUser.passwordHash,
        role: targetRole
      };
      if (targetRole === "broker") {
        createPayload.brokerProfile = {
          brokerCode: await generateUniqueBrokerCode()
        };
      }

      try {
        targetUser = await User.create(createPayload);
      } catch (error) {
        if (error?.code === 11000) {
          targetUser = await User.findOne({ email: req.authUser.email, role: targetRole });
        } else {
          throw error;
        }
      }
    }

    if (!targetUser) {
      logger.error("Switch role failed: target user missing after create/find", {
        userId: String(req.authUser._id),
        fromRole: req.authUser.role,
        targetRole
      });
      return res.status(500).json({ message: "Unable to switch role right now." });
    }

    await ensureBrokerCodeForUser(targetUser);
    targetUser.lastLoginAt = new Date();
    await targetUser.save();
    await syncUserFamilyByEmail(req.authUser);

    const token = signToken(targetUser);
    logger.info("Role switch successful", {
      userId: String(req.authUser._id),
      email: req.authUser.email,
      fromRole: req.authUser.role,
      toRole: targetRole
    });
    return res.json({
      user: toAuthUser(targetUser),
      token
    });
  } catch (error) {
    logger.error("Switch role failed", {
      userId: String(req.authUser?._id || ""),
      fromRole: req.authUser?.role,
      targetRole: String(req.body?.role || "").trim().toLowerCase(),
      message: error?.message || "Unknown role switch error"
    });
    return next(error);
  }
});

export default router;
