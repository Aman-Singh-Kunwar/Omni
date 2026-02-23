import express from "express";
import {
  PendingSignup,
  User,
  bcrypt,
  ensureBrokerCodeForUser,
  extractBearerToken,
  isVerificationExpired,
  logger,
  normalizeEmail,
  normalizeRole,
  signToken,
  toAuthUser,
  verifyToken
} from "./shared.js";

const router = express.Router();

router.post("/auth/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const role = normalizeRole(req.body?.role);

    if (!email || !password || !role) {
      logger.warn("Login failed", {
        reason: "missing_credentials",
        email,
        role
      });
      return res.status(400).json({ message: "Email, password, and role are required." });
    }

    if (!["customer", "broker", "worker"].includes(role)) {
      logger.warn("Login failed", {
        reason: "invalid_role",
        email,
        role
      });
      return res.status(400).json({ message: "Invalid role." });
    }

    const user = await User.findOne({ email, role });
    if (!user) {
      const pendingSignup = await PendingSignup.findOne({ email, role }).select({
        verificationCodeExpiresAt: 1
      });
      if (pendingSignup && !isVerificationExpired(pendingSignup.verificationCodeExpiresAt)) {
        logger.warn("Login blocked: signup verification pending", {
          email,
          role
        });
        return res.status(403).json({ message: "Please verify your email before logging in." });
      }
      logger.warn("Login failed", {
        reason: "user_not_found",
        email,
        role
      });
      return res.status(401).json({ message: "Invalid credentials." });
    }
    if (user.deletedCredentialsAt) {
      logger.warn("Login failed", {
        reason: "deleted_credentials",
        email,
        role,
        userId: String(user._id)
      });
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      logger.warn("Login failed", {
        reason: "invalid_password",
        email,
        role,
        userId: String(user._id)
      });
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
    logger.error("Login failed with exception", {
      email: normalizeEmail(req.body?.email),
      role: normalizeRole(req.body?.role),
      message: error?.message || "Unknown login error"
    });
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

export default router;
