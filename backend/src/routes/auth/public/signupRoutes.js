import express from "express";
import {
  PendingSignup,
  User,
  bcrypt,
  sendMail,
  SIGNUP_VERIFICATION_MAX_ATTEMPTS,
  buildSignupSuccessEmail,
  buildSignupVerificationEmail,
  createOrRestoreUserFromPendingSignup,
  findBrokerByCode,
  generateVerificationCode,
  getVerificationExpiryDate,
  hashVerificationCode,
  isGmailAddress,
  isVerificationExpired,
  logger,
  normalizeEmail,
  normalizeRole,
  normalizeVerificationCode,
  safeNormalizeBrokerCode,
  signToken,
  toAuthUser
} from "./shared.js";

const router = express.Router();

router.post("/auth/signup", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const role = normalizeRole(req.body?.role);
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
    if (existing && !existing.deletedCredentialsAt) {
      logger.warn("Signup failed: email already registered", { email, role, userId: String(existing._id) });
      return res.status(409).json({ message: "Email already registered for this role." });
    }

    const normalizedBrokerCode = safeNormalizeBrokerCode(rawBrokerCode);
    if (rawBrokerCode && !normalizedBrokerCode) {
      logger.warn("Signup failed: invalid referral code format", { email, role });
      return res.status(400).json({ message: "Referral code must be exactly 6 letters/numbers." });
    }

    if (role === "worker" && normalizedBrokerCode) {
      const linkedBroker = await findBrokerByCode(normalizedBrokerCode);
      if (!linkedBroker) {
        logger.warn("Signup failed: referral code not found", { email, role, brokerCode: normalizedBrokerCode });
        return res.status(404).json({ message: "Referral code not found." });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationCode = generateVerificationCode();
    const verificationCodeHash = hashVerificationCode({ email, role, code: verificationCode });
    const verificationCodeExpiresAt = getVerificationExpiryDate();

    await PendingSignup.findOneAndUpdate(
      { email, role },
      {
        $set: {
          name,
          email,
          passwordHash,
          role,
          brokerCode: normalizedBrokerCode || "",
          verificationCodeHash,
          verificationCodeExpiresAt,
          failedVerificationAttempts: 0,
          lastSentAt: new Date()
        },
        $inc: { verificationSendCount: 1 }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    const { subject, text, html } = buildSignupVerificationEmail(name, verificationCode, role);
    try {
      await sendMail({
        to: email,
        subject,
        text,
        html
      });
    } catch (emailError) {
      logger.error("Signup verification email failed", {
        email,
        role,
        message: emailError?.message || "Unknown email send error"
      });
      return res.status(502).json({ message: "Unable to send verification email. Please try again." });
    }

    logger.info("Signup verification pending", {
      email,
      role,
      expiresAt: verificationCodeExpiresAt.toISOString()
    });

    return res.status(202).json({
      message: "Verification code sent to your email. Verify to complete signup.",
      pendingVerification: true,
      email,
      role,
      verificationExpiresAt: verificationCodeExpiresAt
    });
  } catch (error) {
    logger.error("Signup failed", {
      email: normalizeEmail(req.body?.email),
      role: normalizeRole(req.body?.role),
      message: error?.message || "Unknown signup error"
    });
    return next(error);
  }
});

router.post("/auth/signup/verify", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const role = normalizeRole(req.body?.role);
    const verificationCode = normalizeVerificationCode(req.body?.verificationCode);

    if (!email || !role || !verificationCode) {
      logger.warn("Signup verification failed: missing fields", { email, role });
      return res.status(400).json({ message: "Email, role, and verification code are required." });
    }
    if (!["customer", "broker", "worker"].includes(role)) {
      logger.warn("Signup verification failed: invalid role", { email, role });
      return res.status(400).json({ message: "Invalid role." });
    }
    if (!/^\d{6}$/.test(verificationCode)) {
      logger.warn("Signup verification failed: invalid code format", { email, role });
      return res.status(400).json({ message: "Verification code must be exactly 6 digits." });
    }

    const pendingSignup = await PendingSignup.findOne({ email, role });
    if (!pendingSignup) {
      logger.warn("Signup verification failed: pending request not found", { email, role });
      return res.status(404).json({ message: "No pending signup found. Please sign up again." });
    }
    if (isVerificationExpired(pendingSignup.verificationCodeExpiresAt)) {
      await PendingSignup.deleteOne({ _id: pendingSignup._id });
      logger.warn("Signup verification failed: code expired", { email, role });
      return res.status(410).json({ message: "Verification code expired. Please sign up again." });
    }
    if (pendingSignup.failedVerificationAttempts >= SIGNUP_VERIFICATION_MAX_ATTEMPTS) {
      await PendingSignup.deleteOne({ _id: pendingSignup._id });
      logger.warn("Signup verification failed: too many attempts", {
        email,
        role,
        attempts: pendingSignup.failedVerificationAttempts
      });
      return res.status(429).json({ message: "Too many invalid attempts. Please sign up again." });
    }

    const receivedCodeHash = hashVerificationCode({ email, role, code: verificationCode });
    if (receivedCodeHash !== pendingSignup.verificationCodeHash) {
      pendingSignup.failedVerificationAttempts += 1;
      await pendingSignup.save();
      logger.warn("Signup verification failed: invalid code", {
        email,
        role,
        attempts: pendingSignup.failedVerificationAttempts
      });
      if (pendingSignup.failedVerificationAttempts >= SIGNUP_VERIFICATION_MAX_ATTEMPTS) {
        await PendingSignup.deleteOne({ _id: pendingSignup._id });
        return res.status(429).json({ message: "Too many invalid attempts. Please sign up again." });
      }
      return res.status(401).json({ message: "Invalid verification code." });
    }

    const { user, restoredCredentials } = await createOrRestoreUserFromPendingSignup(pendingSignup);
    await PendingSignup.deleteOne({ _id: pendingSignup._id });

    try {
      const emailContent = buildSignupSuccessEmail(user.name, user.role);
      await sendMail({
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      });
    } catch (emailError) {
      logger.warn("Signup success email failed", {
        userId: String(user._id),
        email: user.email,
        role: user.role,
        message: emailError?.message || "Unknown success email error"
      });
    }

    const token = signToken(user);
    logger.info("Signup successful", {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      restoredCredentials
    });

    return res.status(201).json({
      user: toAuthUser(user),
      token,
      message: "Email verified and account created successfully."
    });
  } catch (error) {
    logger.error("Signup verification failed", {
      email: normalizeEmail(req.body?.email),
      role: normalizeRole(req.body?.role),
      message: error?.message || "Unknown verification error"
    });
    return next(error);
  }
});

export default router;
