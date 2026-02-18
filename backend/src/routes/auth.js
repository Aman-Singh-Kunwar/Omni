import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { ensureBrokerCodeForUser, extractBearerToken, generateUniqueBrokerCode, requireAuth, signToken, toAuthUser, verifyToken } from "./helpers.js";
import logger from "../utils/logger.js";
import { syncUserFamilyByEmail } from "../utils/userSync.js";
const router = express.Router();

router.post("/auth/signup", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "").trim();

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required." });
    }

    if (!["customer", "broker", "worker"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email, role }).lean();
    if (existing) {
      return res.status(409).json({ message: "Email already registered for this role." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userPayload = { name, email, passwordHash, role };
    if (role === "broker") {
      userPayload.brokerProfile = {
        brokerCode: await generateUniqueBrokerCode()
      };
    }

    const user = await User.create(userPayload);
    await syncUserFamilyByEmail(user);
    const token = signToken(user);

    return res.status(201).json({
      user: toAuthUser(user),
      token
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "").trim();

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required." });
    }

    if (!["customer", "broker", "worker"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const user = await User.findOne({ email, role });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    user.lastLoginAt = new Date();
    await ensureBrokerCodeForUser(user);
    await user.save();

    const token = signToken(user);
    logger.info("Login successful", {
      userId: String(user._id),
      email,
      role: user.role
    });

    return res.json({
      user: toAuthUser(user),
      token
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/auth/me", async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "Missing auth token." });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (_error) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    await ensureBrokerCodeForUser(user);
    return res.json({ user: toAuthUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/switch-role", requireAuth, async (req, res, next) => {
  try {
    const targetRole = String(req.body?.role || "")
      .trim()
      .toLowerCase();

    if (!["customer", "broker", "worker"].includes(targetRole)) {
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
      return res.status(500).json({ message: "Unable to switch role right now." });
    }

    await ensureBrokerCodeForUser(targetUser);
    targetUser.lastLoginAt = new Date();
    await targetUser.save();
    await syncUserFamilyByEmail(req.authUser);

    const token = signToken(targetUser);
    return res.json({
      user: toAuthUser(targetUser),
      token
    });
  } catch (error) {
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
    return next(error);
  }
});

export default router;
