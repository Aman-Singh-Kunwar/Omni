import express from "express";
import {
  bcrypt,
  User,
  ensureBrokerCodeForUser,
  extractBearerToken,
  findBrokerByCode,
  generateUniqueBrokerCode,
  isGmailAddress,
  logger,
  safeNormalizeBrokerCode,
  signToken,
  syncUserFamilyByEmail,
  toAuthUser,
  verifyToken
} from "./shared.js";

const router = express.Router();

router.post("/auth/signup", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "").trim();
    const rawBrokerCode = String(req.body?.brokerCode || "").trim();

    if (!name || !email || !password || !role) {
      logger.warn("Signup failed: missing fields", { email, role });
      return res.status(400).json({ message: "Name, email, password, and role are required." });
    }
    if (!isGmailAddress(email)) {
      logger.warn("Signup failed: non-gmail email", { email, role });
      return res.status(400).json({ message: "Only @gmail.com email addresses are allowed." });
    }

    if (!["customer", "broker", "worker"].includes(role)) {
      logger.warn("Signup failed: invalid role", { email, role });
      return res.status(400).json({ message: "Invalid role." });
    }

    if (password.length < 6) {
      logger.warn("Signup failed: short password", { email, role });
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email, role });
    const normalizedBrokerCode = safeNormalizeBrokerCode(rawBrokerCode);
    if (rawBrokerCode && !normalizedBrokerCode) {
      logger.warn("Signup failed: invalid referral code format", { email, role });
      return res.status(400).json({ message: "Referral code must be exactly 6 letters/numbers." });
    }

    if (existing) {
      if (!existing.deletedCredentialsAt) {
        logger.warn("Signup failed: email already registered", { email, role, userId: String(existing._id) });
        return res.status(409).json({ message: "Email already registered for this role." });
      }

      existing.passwordHash = await bcrypt.hash(password, 10);
      existing.deletedCredentialsAt = null;
      existing.lastLoginAt = new Date();

      if (role === "worker") {
        if (normalizedBrokerCode) {
          const linkedBroker = await findBrokerByCode(normalizedBrokerCode);
          if (!linkedBroker) {
            logger.warn("Signup failed: referral code not found", { email, role, brokerCode: normalizedBrokerCode });
            return res.status(404).json({ message: "Referral code not found." });
          }
          if (!existing.workerProfile) {
            existing.workerProfile = {};
          }
          existing.workerProfile.brokerCode = linkedBroker.code;
          existing.workerProfile.brokerId = linkedBroker.id;
          logger.info("Worker referral code linked", {
            email,
            role,
            userId: String(existing._id),
            brokerCode: linkedBroker.code
          });
        }
        if (!existing.workerProfile) {
          existing.workerProfile = {};
        }
        existing.workerProfile.isAvailable = true;
      }

      await ensureBrokerCodeForUser(existing);
      await existing.save();
      await syncUserFamilyByEmail(existing);

      const token = signToken(existing);
      logger.info("Signup successful", {
        userId: String(existing._id),
        email,
        role: existing.role,
        restoredCredentials: true
      });
      return res.status(201).json({
        user: toAuthUser(existing),
        token
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userPayload = { name, email, passwordHash, role };
    if (role === "worker" && normalizedBrokerCode) {
      const linkedBroker = await findBrokerByCode(normalizedBrokerCode);
      if (!linkedBroker) {
        logger.warn("Signup failed: referral code not found", { email, role, brokerCode: normalizedBrokerCode });
        return res.status(404).json({ message: "Referral code not found." });
      }
      userPayload.workerProfile = {
        brokerCode: linkedBroker.code,
        brokerId: linkedBroker.id
      };
    }
    if (role === "broker") {
      userPayload.brokerProfile = {
        brokerCode: await generateUniqueBrokerCode()
      };
    }

    const user = await User.create(userPayload);
    await syncUserFamilyByEmail(user);
    const token = signToken(user);
    if (role === "worker" && normalizedBrokerCode) {
      logger.info("Worker referral code linked", {
        userId: String(user._id),
        email,
        role,
        brokerCode: normalizedBrokerCode
      });
    }
    logger.info("Signup successful", {
      userId: String(user._id),
      email,
      role: user.role,
      restoredCredentials: false
    });

    return res.status(201).json({
      user: toAuthUser(user),
      token
    });
  } catch (error) {
    logger.error("Signup failed", {
      email: String(req.body?.email || "").trim().toLowerCase(),
      role: String(req.body?.role || "").trim(),
      message: error?.message || "Unknown signup error"
    });
    return next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "").trim();

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
      email: String(req.body?.email || "").trim().toLowerCase(),
      role: String(req.body?.role || "").trim(),
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
