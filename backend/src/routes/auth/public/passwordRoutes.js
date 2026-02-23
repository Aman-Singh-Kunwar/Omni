import express from "express";
import {
  FORGOT_PASSWORD_MAX_ATTEMPTS,
  PendingPasswordReset,
  User,
  bcrypt,
  buildForgotPasswordCodeEmail,
  buildPasswordResetSuccessEmail,
  generateForgotPasswordCode,
  getForgotPasswordExpiryDate,
  hashForgotPasswordCode,
  isForgotPasswordExpired,
  logger,
  normalizeEmail,
  normalizeRole,
  normalizeVerificationCode,
  sendMail,
  syncUserFamilyByEmail
} from "./shared.js";

const router = express.Router();

router.post("/auth/forgot-password/request", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const role = normalizeRole(req.body?.role);

    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required." });
    }
    if (!["customer", "broker", "worker"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const user = await User.findOne({ email, role });
    const responseMessage = "If an account exists, a password reset code has been sent to the email address.";
    if (!user || user.deletedCredentialsAt) {
      return res.json({ message: responseMessage, pendingReset: true });
    }

    const resetCode = generateForgotPasswordCode();
    const resetCodeHash = hashForgotPasswordCode({ email, role, code: resetCode });
    const resetCodeExpiresAt = getForgotPasswordExpiryDate();

    await PendingPasswordReset.findOneAndUpdate(
      { email, role },
      {
        $set: {
          email,
          role,
          resetCodeHash,
          resetCodeExpiresAt,
          failedAttempts: 0,
          lastSentAt: new Date()
        },
        $inc: { sendCount: 1 }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    const mail = buildForgotPasswordCodeEmail(user.name, resetCode, role);
    try {
      await sendMail({
        to: email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html
      });
    } catch (emailError) {
      logger.error("Forgot password email failed", {
        email,
        role,
        message: emailError?.message || "Unknown forgot password email error"
      });
      return res.status(502).json({ message: "Unable to send password reset email. Please try again." });
    }

    logger.info("Forgot password code issued", {
      email,
      role,
      expiresAt: resetCodeExpiresAt.toISOString()
    });
    return res.json({ message: responseMessage, pendingReset: true });
  } catch (error) {
    logger.error("Forgot password request failed", {
      email: normalizeEmail(req.body?.email),
      role: normalizeRole(req.body?.role),
      message: error?.message || "Unknown forgot password request error"
    });
    return next(error);
  }
});

router.post("/auth/forgot-password/verify", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const role = normalizeRole(req.body?.role);
    const resetCode = normalizeVerificationCode(req.body?.verificationCode);
    const newPassword = String(req.body?.newPassword || "");

    if (!email || !role || !resetCode || !newPassword) {
      return res.status(400).json({ message: "Email, role, verification code, and new password are required." });
    }
    if (!["customer", "broker", "worker"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }
    if (!/^\d{6}$/.test(resetCode)) {
      return res.status(400).json({ message: "Verification code must be exactly 6 digits." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const pendingReset = await PendingPasswordReset.findOne({ email, role });
    if (!pendingReset) {
      return res.status(404).json({ message: "No pending password reset found. Request a new code." });
    }
    if (isForgotPasswordExpired(pendingReset.resetCodeExpiresAt)) {
      await PendingPasswordReset.deleteOne({ _id: pendingReset._id });
      return res.status(410).json({ message: "Reset code expired. Request a new code." });
    }
    if (pendingReset.failedAttempts >= FORGOT_PASSWORD_MAX_ATTEMPTS) {
      await PendingPasswordReset.deleteOne({ _id: pendingReset._id });
      return res.status(429).json({ message: "Too many invalid attempts. Request a new code." });
    }

    const resetCodeHash = hashForgotPasswordCode({ email, role, code: resetCode });
    if (resetCodeHash !== pendingReset.resetCodeHash) {
      pendingReset.failedAttempts += 1;
      await pendingReset.save();
      if (pendingReset.failedAttempts >= FORGOT_PASSWORD_MAX_ATTEMPTS) {
        await PendingPasswordReset.deleteOne({ _id: pendingReset._id });
        return res.status(429).json({ message: "Too many invalid attempts. Request a new code." });
      }
      return res.status(401).json({ message: "Invalid verification code." });
    }

    const user = await User.findOne({ email, role });
    if (!user || user.deletedCredentialsAt) {
      await PendingPasswordReset.deleteOne({ _id: pendingReset._id });
      return res.status(404).json({ message: "Account not found for this email and role." });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(409).json({ message: "New password must be different from current password." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    await syncUserFamilyByEmail(user);
    await PendingPasswordReset.deleteOne({ _id: pendingReset._id });

    try {
      const mail = buildPasswordResetSuccessEmail(user.name, role);
      await sendMail({
        to: email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html
      });
    } catch (emailError) {
      logger.warn("Forgot password success email failed", {
        email,
        role,
        userId: String(user._id),
        message: emailError?.message || "Unknown forgot password success email error"
      });
    }

    logger.info("Password reset successful", {
      email,
      role,
      userId: String(user._id)
    });
    return res.json({ message: "Password reset successful. You can now log in with your new password." });
  } catch (error) {
    logger.error("Forgot password verification failed", {
      email: normalizeEmail(req.body?.email),
      role: normalizeRole(req.body?.role),
      message: error?.message || "Unknown forgot password verification error"
    });
    return next(error);
  }
});

export default router;
