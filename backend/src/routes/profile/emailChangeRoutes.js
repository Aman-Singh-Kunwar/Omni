import crypto from "crypto";
import express from "express";
import PendingEmailChange from "../../models/PendingEmailChange.js";
import { sendMail } from "../../utils/mailer.js";
import {
  ensureEmailCanMoveForFamily,
  enrichWorkerProfile,
  getWorkerBrokerCommissionProgress,
  isGmailAddress,
  logger,
  requireAuth,
  syncUserFamilyByEmail,
  toAuthUser,
  toProfileDto
} from "./shared.js";

const router = express.Router();

const EMAIL_CHANGE_CODE_LENGTH = 6;
const EMAIL_CHANGE_EXPIRY_MINUTES = Math.max(1, Number(process.env.EMAIL_CHANGE_VERIFICATION_EXPIRY_MINUTES || 10));
const EMAIL_CHANGE_MAX_ATTEMPTS = 5;
const EMAIL_CHANGE_SECRET = String(
  process.env.EMAIL_CHANGE_VERIFICATION_SECRET ||
    process.env.SIGNUP_VERIFICATION_SECRET ||
    process.env.JWT_SECRET ||
    "omni-email-change-secret"
).trim();

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeVerificationCode(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .trim();
}

function generateVerificationCode() {
  let code = "";
  for (let index = 0; index < EMAIL_CHANGE_CODE_LENGTH; index += 1) {
    code += String(crypto.randomInt(0, 10));
  }
  return code;
}

function hashVerificationCode({ userId, role, nextEmail, code }) {
  return crypto
    .createHash("sha256")
    .update(`${EMAIL_CHANGE_SECRET}|${String(userId)}|${String(role)}|${normalizeEmail(nextEmail)}|${normalizeVerificationCode(code)}`)
    .digest("hex");
}

function getExpiryDate() {
  return new Date(Date.now() + EMAIL_CHANGE_EXPIRY_MINUTES * 60 * 1000);
}

function isExpired(expiresAt) {
  return !expiresAt || new Date(expiresAt).getTime() <= Date.now();
}

function buildEmailChangeVerificationEmail(name, verificationCode, role) {
  const safeName = String(name || "User").trim() || "User";
  const safeRole = String(role || "user").trim();
  const safeCode = String(verificationCode || "").trim();
  const subject = "Verify your new Omni email address";
  const text = `Hello ${safeName},

Use the code below to verify your new email for your Omni ${safeRole} account:
${safeCode}

This code expires in ${EMAIL_CHANGE_EXPIRY_MINUTES} minutes.

If you did not request an email update, ignore this message.

Omni Team`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;padding:20px;background:#f8fafc;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
        <h2 style="margin:0 0 12px;">Verify New Email</h2>
        <p style="margin:0 0 14px;line-height:1.6;">Hello ${safeName}, use this one-time code to confirm your new email on Omni.</p>
        <div style="margin:0 0 14px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:#475569;letter-spacing:0.05em;text-transform:uppercase;">Verification Code</p>
          <p style="margin:0;font-size:30px;font-weight:700;letter-spacing:8px;">${safeCode}</p>
        </div>
        <p style="margin:0 0 10px;font-size:14px;color:#475569;">Code expires in <strong>${EMAIL_CHANGE_EXPIRY_MINUTES} minutes</strong>.</p>
        <p style="margin:0;font-size:13px;color:#64748b;">If this was not requested by you, no action is required.</p>
      </div>
    </div>
  `;
  return { subject, text, html };
}

router.post("/profile/email-change/request", requireAuth, async (req, res, next) => {
  try {
    const nextEmail = normalizeEmail(req.body?.email);
    const role = req.authUser.role;
    const currentEmail = normalizeEmail(req.authUser.email);

    if (!nextEmail) {
      return res.status(400).json({ message: "New email is required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nextEmail)) {
      return res.status(400).json({ message: "Invalid email format." });
    }
    if (!isGmailAddress(nextEmail)) {
      return res.status(400).json({ message: "Only @gmail.com email addresses are allowed." });
    }
    if (nextEmail === currentEmail) {
      return res.status(400).json({ message: "New email must be different from current email." });
    }

    await ensureEmailCanMoveForFamily(req.authUser, nextEmail);

    const verificationCode = generateVerificationCode();
    const verificationCodeHash = hashVerificationCode({
      userId: req.authUser._id,
      role,
      nextEmail,
      code: verificationCode
    });
    const verificationCodeExpiresAt = getExpiryDate();

    await PendingEmailChange.deleteMany({
      userId: req.authUser._id,
      role,
      nextEmail: { $ne: nextEmail }
    });

    await PendingEmailChange.findOneAndUpdate(
      { userId: req.authUser._id, role, nextEmail },
      {
        $set: {
          currentEmail,
          nextEmail,
          verificationCodeHash,
          verificationCodeExpiresAt,
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

    const emailContent = buildEmailChangeVerificationEmail(req.authUser.name, verificationCode, role);
    await sendMail({
      to: nextEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    });

    logger.info("Email change verification sent", {
      userId: String(req.authUser._id),
      role,
      currentEmail,
      nextEmail
    });

    return res.status(202).json({
      message: "Verification code sent to your new email address.",
      pendingEmail: nextEmail,
      verificationExpiresAt: verificationCodeExpiresAt
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    logger.error("Email change request failed", {
      userId: String(req.authUser?._id || ""),
      role: req.authUser?.role,
      message: error?.message || "Unknown email change request error"
    });
    return next(error);
  }
});

router.post("/profile/email-change/verify", requireAuth, async (req, res, next) => {
  try {
    const nextEmail = normalizeEmail(req.body?.email);
    const verificationCode = normalizeVerificationCode(req.body?.verificationCode);
    const role = req.authUser.role;
    const userId = String(req.authUser._id);

    if (!nextEmail || !verificationCode) {
      return res.status(400).json({ message: "Email and verification code are required." });
    }
    if (!/^\d{6}$/.test(verificationCode)) {
      return res.status(400).json({ message: "Verification code must be exactly 6 digits." });
    }

    const pending = await PendingEmailChange.findOne({ userId: req.authUser._id, role, nextEmail });
    if (!pending) {
      return res.status(404).json({ message: "No pending email verification found for this email." });
    }

    if (isExpired(pending.verificationCodeExpiresAt)) {
      await PendingEmailChange.deleteOne({ _id: pending._id });
      return res.status(410).json({ message: "Verification code expired. Request a new code." });
    }

    if (pending.failedAttempts >= EMAIL_CHANGE_MAX_ATTEMPTS) {
      await PendingEmailChange.deleteOne({ _id: pending._id });
      return res.status(429).json({ message: "Too many invalid attempts. Request a new code." });
    }

    const receivedHash = hashVerificationCode({
      userId: req.authUser._id,
      role,
      nextEmail,
      code: verificationCode
    });
    if (receivedHash !== pending.verificationCodeHash) {
      pending.failedAttempts += 1;
      await pending.save();
      if (pending.failedAttempts >= EMAIL_CHANGE_MAX_ATTEMPTS) {
        await PendingEmailChange.deleteOne({ _id: pending._id });
        return res.status(429).json({ message: "Too many invalid attempts. Request a new code." });
      }
      return res.status(401).json({ message: "Invalid verification code." });
    }

    const oldEmail = req.authUser.email;
    await ensureEmailCanMoveForFamily(req.authUser, nextEmail);
    req.authUser.email = nextEmail;
    req.authUser.emailVerified = true;
    await req.authUser.save();
    await syncUserFamilyByEmail(req.authUser, { oldEmail });
    await PendingEmailChange.deleteMany({ userId: req.authUser._id, role });

    const payloadResponse = toProfileDto(req.authUser);
    if (req.authUser.role === "worker") {
      const enrichedProfile = await enrichWorkerProfile(req.authUser, payloadResponse.profile);
      const progress = await getWorkerBrokerCommissionProgress(req.authUser);
      payloadResponse.profile = {
        ...enrichedProfile,
        brokerCommissionJobsUsed: progress.usedJobs,
        brokerCommissionJobsLimit: progress.jobLimit,
        brokerCommissionUsage: progress.usageLabel
      };
    }

    logger.info("Email change verified", {
      userId,
      role,
      oldEmail: normalizeEmail(oldEmail),
      nextEmail
    });

    return res.json({
      ...payloadResponse,
      user: toAuthUser(req.authUser),
      message: "Email updated and verified successfully."
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    logger.error("Email change verification failed", {
      userId: String(req.authUser?._id || ""),
      role: req.authUser?.role,
      message: error?.message || "Unknown email change verification error"
    });
    return next(error);
  }
});

export default router;
