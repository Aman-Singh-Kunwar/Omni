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
  verifyToken,
  sendMail,
  generateTwoFactorOTP,
  getTwoFactorExpiryDate,
  isTwoFactorOTPExpired,
  buildTwoFactorOTPEmail
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

    // Check if 2FA is enabled
    if (user.twoFactorAuth?.twoFactorAuthEnabled) {
      const otpCode = generateTwoFactorOTP();
      const otpExpiresAt = getTwoFactorExpiryDate();

      user.twoFactorAuth.otpCode = otpCode;
      user.twoFactorAuth.otpExpiresAt = otpExpiresAt;
      await user.save();

      const { subject, text, html } = buildTwoFactorOTPEmail(user.name, otpCode);
      try {
        await sendMail({ to: user.email, subject, text, html });
      } catch (mailError) {
        logger.error("Failed to send 2FA OTP email", {
          userId: String(user._id),
          email: user.email,
          error: mailError?.message
        });
      }

      logger.info("2FA OTP sent", {
        userId: String(user._id),
        email: user.email,
        role: user.role
      });

      return res.json({
        requiresTwoFactor: true,
        message: "Verification code sent to your email. Please enter the OTP to complete login."
      });
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

router.post("/auth/verify-2fa", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const role = normalizeRole(req.body?.role);
    const otpCode = String(req.body?.otpCode || "").replace(/\s+/g, "").trim();

    if (!email || !role || !otpCode) {
      logger.warn("2FA verification failed", {
        reason: "missing_fields",
        email,
        role
      });
      return res.status(400).json({ message: "Email, role, and OTP code are required." });
    }

    const user = await User.findOne({ email, role });
    if (!user) {
      logger.warn("2FA verification failed", {
        reason: "user_not_found",
        email,
        role
      });
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (!user.twoFactorAuth?.twoFactorAuthEnabled) {
      logger.warn("2FA verification failed", {
        reason: "2fa_not_enabled",
        email,
        role,
        userId: String(user._id)
      });
      return res.status(400).json({ message: "Two-factor authentication is not enabled." });
    }

    if (isTwoFactorOTPExpired(user.twoFactorAuth.otpExpiresAt)) {
      logger.warn("2FA verification failed", {
        reason: "otp_expired",
        email,
        role,
        userId: String(user._id)
      });
      return res.status(401).json({ message: "OTP has expired. Please log in again." });
    }

    if (user.twoFactorAuth.otpCode !== otpCode) {
      logger.warn("2FA verification failed", {
        reason: "invalid_otp",
        email,
        role,
        userId: String(user._id)
      });
      return res.status(401).json({ message: "Invalid OTP code." });
    }

    // Clear the OTP after successful verification
    user.twoFactorAuth.otpCode = null;
    user.twoFactorAuth.otpExpiresAt = null;
    user.lastLoginAt = new Date();
    await ensureBrokerCodeForUser(user);
    await user.save();

    const token = signToken(user);
    logger.info("2FA verification successful", {
      userId: String(user._id),
      email,
      role: user.role
    });

    return res.json({
      user: toAuthUser(user),
      token
    });
  } catch (error) {
    logger.error("2FA verification failed with exception", {
      email: normalizeEmail(req.body?.email),
      role: normalizeRole(req.body?.role),
      message: error?.message || "Unknown 2FA verification error"
    });
    return next(error);
  }
});

export default router;
