import express from "express";
import crypto from "crypto";
import PendingSignup from "../../models/PendingSignup.js";
import PendingPasswordReset from "../../models/PendingPasswordReset.js";
import { sendMail } from "../../utils/mailer.js";
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
const SIGNUP_VERIFICATION_CODE_LENGTH = 6;
const SIGNUP_VERIFICATION_EXPIRY_MINUTES = Math.max(1, Number(process.env.SIGNUP_VERIFICATION_EXPIRY_MINUTES || 10));
const SIGNUP_VERIFICATION_MAX_ATTEMPTS = 5;
const SIGNUP_VERIFICATION_SECRET = String(
  process.env.SIGNUP_VERIFICATION_SECRET || process.env.JWT_SECRET || "omni-signup-verification-secret"
).trim();
const FORGOT_PASSWORD_CODE_LENGTH = 6;
const FORGOT_PASSWORD_EXPIRY_MINUTES = Math.max(1, Number(process.env.FORGOT_PASSWORD_EXPIRY_MINUTES || 10));
const FORGOT_PASSWORD_MAX_ATTEMPTS = 5;
const FORGOT_PASSWORD_SECRET = String(
  process.env.FORGOT_PASSWORD_SECRET || process.env.SIGNUP_VERIFICATION_SECRET || process.env.JWT_SECRET || "omni-forgot-password-secret"
).trim();
const EMAIL_ACCENT_COLOR = "#2563eb";
const EMAIL_TEXT_COLOR = "#0f172a";
const EMAIL_MUTED_TEXT_COLOR = "#475569";
const EMAIL_BORDER_COLOR = "#e2e8f0";
const EMAIL_BG_COLOR = "#f8fafc";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(value) {
  return String(value || "").trim();
}

function normalizeVerificationCode(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .trim();
}

function generateVerificationCode() {
  let code = "";
  for (let index = 0; index < SIGNUP_VERIFICATION_CODE_LENGTH; index += 1) {
    code += String(crypto.randomInt(0, 10));
  }
  return code;
}

function generateForgotPasswordCode() {
  let code = "";
  for (let index = 0; index < FORGOT_PASSWORD_CODE_LENGTH; index += 1) {
    code += String(crypto.randomInt(0, 10));
  }
  return code;
}

function hashVerificationCode({ email, role, code }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = normalizeRole(role);
  const normalizedCode = normalizeVerificationCode(code);
  return crypto
    .createHash("sha256")
    .update(`${SIGNUP_VERIFICATION_SECRET}|${normalizedEmail}|${normalizedRole}|${normalizedCode}`)
    .digest("hex");
}

function hashForgotPasswordCode({ email, role, code }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = normalizeRole(role);
  const normalizedCode = normalizeVerificationCode(code);
  return crypto
    .createHash("sha256")
    .update(`${FORGOT_PASSWORD_SECRET}|${normalizedEmail}|${normalizedRole}|${normalizedCode}`)
    .digest("hex");
}

function getVerificationExpiryDate() {
  return new Date(Date.now() + SIGNUP_VERIFICATION_EXPIRY_MINUTES * 60 * 1000);
}

function isVerificationExpired(expiresAt) {
  return !expiresAt || new Date(expiresAt).getTime() <= Date.now();
}

function getForgotPasswordExpiryDate() {
  return new Date(Date.now() + FORGOT_PASSWORD_EXPIRY_MINUTES * 60 * 1000);
}

function isForgotPasswordExpired(expiresAt) {
  return !expiresAt || new Date(expiresAt).getTime() <= Date.now();
}

function normalizeBaseUrl(value, fallback) {
  const normalized = String(value || fallback || "").trim().replace(/\/+$/, "");
  return normalized || String(fallback || "").trim();
}

const isProductionEnv = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const DEFAULT_ROLE_BASE_URLS = {
  landing: isProductionEnv ? "https://omni-landing-page.onrender.com" : "http://localhost:5173",
  customer: isProductionEnv ? "https://omni-customer.onrender.com" : "http://localhost:5174",
  broker: isProductionEnv ? "https://omni-broker.onrender.com" : "http://localhost:5175",
  worker: isProductionEnv ? "https://omni-worker.onrender.com" : "http://localhost:5176"
};

function getRoleLabel(role) {
  if (role === "customer") {
    return "Customer";
  }
  if (role === "broker") {
    return "Broker";
  }
  if (role === "worker") {
    return "Worker";
  }
  return "User";
}

function getRoleAppBaseUrl(role) {
  if (role === "customer") {
    return normalizeBaseUrl(process.env.CUSTOMER_APP_URL, DEFAULT_ROLE_BASE_URLS.customer);
  }
  if (role === "broker") {
    return normalizeBaseUrl(process.env.BROKER_APP_URL, DEFAULT_ROLE_BASE_URLS.broker);
  }
  if (role === "worker") {
    return normalizeBaseUrl(process.env.WORKER_APP_URL, DEFAULT_ROLE_BASE_URLS.worker);
  }
  return normalizeBaseUrl(process.env.LANDING_APP_URL, DEFAULT_ROLE_BASE_URLS.landing);
}

function getRoleLoginUrl(role) {
  return `${getRoleAppBaseUrl(role)}/login`;
}

function getRoleSignupUrl(role) {
  return `${getRoleAppBaseUrl(role)}/signup`;
}

function getLandingUrl() {
  return normalizeBaseUrl(process.env.LANDING_APP_URL, DEFAULT_ROLE_BASE_URLS.landing);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailShell({ preheader, heading, greetingName, bodyHtml, primaryCtaLabel, primaryCtaUrl, footerHtml }) {
  const safePreheader = escapeHtml(preheader);
  const safeHeading = escapeHtml(heading);
  const safeGreetingName = escapeHtml(greetingName);
  const safePrimaryCtaLabel = escapeHtml(primaryCtaLabel);
  const safePrimaryCtaUrl = escapeHtml(primaryCtaUrl);

  return `
    <div style="background:${EMAIL_BG_COLOR};padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${safePreheader}
      </div>
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid ${EMAIL_BORDER_COLOR};border-radius:12px;overflow:hidden;">
        <div style="background:${EMAIL_ACCENT_COLOR};padding:18px 24px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;line-height:1.3;font-weight:700;">Omni</h1>
        </div>
        <div style="padding:24px;">
          <h2 style="margin:0 0 12px;color:${EMAIL_TEXT_COLOR};font-size:22px;line-height:1.3;">${safeHeading}</h2>
          <p style="margin:0 0 18px;color:${EMAIL_TEXT_COLOR};font-size:15px;line-height:1.6;">Hello ${safeGreetingName},</p>
          ${bodyHtml}
          ${
            safePrimaryCtaLabel && safePrimaryCtaUrl
              ? `<div style="margin:24px 0 0;">
              <a href="${safePrimaryCtaUrl}" style="display:inline-block;background:${EMAIL_ACCENT_COLOR};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;font-size:14px;">
                ${safePrimaryCtaLabel}
              </a>
            </div>`
              : ""
          }
        </div>
        <div style="padding:16px 24px;border-top:1px solid ${EMAIL_BORDER_COLOR};background:#f8fafc;color:${EMAIL_MUTED_TEXT_COLOR};font-size:12px;line-height:1.6;">
          ${footerHtml}
        </div>
      </div>
    </div>
  `;
}

function buildSignupVerificationEmail(name, verificationCode, role) {
  const safeName = String(name || "User").trim() || "User";
  const safeVerificationCode = String(verificationCode || "").trim();
  const roleLabel = getRoleLabel(role);
  const signupUrl = getRoleSignupUrl(role);
  const subject = `Action Required: Verify your Omni ${roleLabel} account`;
  const text = `Hello ${safeName},

Welcome to Omni. Please verify your ${roleLabel} account with the code below:
${safeVerificationCode}

This code expires in ${SIGNUP_VERIFICATION_EXPIRY_MINUTES} minutes.
If you were signing up from a different page, open: ${signupUrl}

If you did not request this account, you can ignore this email.

Omni Team`;

  const bodyHtml = `
    <p style="margin:0 0 14px;color:${EMAIL_TEXT_COLOR};font-size:15px;line-height:1.7;">
      Thank you for signing up for Omni as a <strong>${escapeHtml(roleLabel)}</strong>. Use the verification code below to complete your registration.
    </p>
    <div style="margin:0 0 16px;padding:14px;border:1px solid ${EMAIL_BORDER_COLOR};border-radius:10px;background:${EMAIL_BG_COLOR};text-align:center;">
      <p style="margin:0 0 6px;color:${EMAIL_MUTED_TEXT_COLOR};font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">Verification Code</p>
      <p style="margin:0;color:${EMAIL_TEXT_COLOR};font-size:30px;font-weight:700;letter-spacing:8px;">${escapeHtml(safeVerificationCode)}</p>
    </div>
    <p style="margin:0 0 10px;color:${EMAIL_TEXT_COLOR};font-size:14px;line-height:1.7;">
      This code expires in <strong>${SIGNUP_VERIFICATION_EXPIRY_MINUTES} minutes</strong>.
    </p>
    <p style="margin:0;color:${EMAIL_MUTED_TEXT_COLOR};font-size:13px;line-height:1.7;">
      If you did not request this account, no further action is required.
    </p>
  `;

  const html = buildEmailShell({
    preheader: "Verify your Omni account with your one-time code.",
    heading: "Verify Your Email Address",
    greetingName: safeName,
    bodyHtml,
    primaryCtaLabel: "Continue Signup",
    primaryCtaUrl: signupUrl,
    footerHtml: `This is an automated message from Omni. For security, never share your verification code.`
  });

  return { subject, text, html };
}

function buildSignupSuccessEmail(name, role) {
  const safeName = String(name || "User").trim() || "User";
  const roleLabel = getRoleLabel(role);
  const roleLoginUrl = getRoleLoginUrl(role);
  const rolePortalUrl = getRoleAppBaseUrl(role);
  const landingUrl = getLandingUrl();
  const subject = `Welcome to Omni, ${roleLabel} account verified successfully`;
  const text = `Hello ${safeName},

Your email verification is successful and your Omni ${roleLabel} account is now active.

${roleLabel} Login: ${roleLoginUrl}
${roleLabel} Portal: ${rolePortalUrl}
Omni Landing Page: ${landingUrl}

Welcome to Omni.
Omni Team`;

  const bodyHtml = `
    <p style="margin:0 0 14px;color:${EMAIL_TEXT_COLOR};font-size:15px;line-height:1.7;">
      Your email verification is <strong>successful</strong>. Your Omni <strong>${escapeHtml(roleLabel)}</strong> account is active and ready to use.
    </p>
    <div style="margin:0 0 16px;padding:14px;border:1px solid ${EMAIL_BORDER_COLOR};border-radius:10px;background:${EMAIL_BG_COLOR};">
      <p style="margin:0 0 6px;color:${EMAIL_MUTED_TEXT_COLOR};font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">Account Type</p>
      <p style="margin:0;color:${EMAIL_TEXT_COLOR};font-size:18px;font-weight:700;">${escapeHtml(roleLabel)}</p>
    </div>
    <p style="margin:0 0 8px;color:${EMAIL_MUTED_TEXT_COLOR};font-size:13px;line-height:1.7;">
      <strong>${escapeHtml(roleLabel)} Portal:</strong>
      <a href="${escapeHtml(rolePortalUrl)}" style="color:${EMAIL_ACCENT_COLOR};text-decoration:none;">${escapeHtml(rolePortalUrl)}</a>
    </p>
    <p style="margin:0;color:${EMAIL_MUTED_TEXT_COLOR};font-size:13px;line-height:1.7;">
      <strong>Omni Landing Page:</strong>
      <a href="${escapeHtml(landingUrl)}" style="color:${EMAIL_ACCENT_COLOR};text-decoration:none;">${escapeHtml(landingUrl)}</a>
    </p>
  `;

  const html = buildEmailShell({
    preheader: "Your Omni account is verified and active.",
    heading: "Welcome to Omni",
    greetingName: safeName,
    bodyHtml,
    primaryCtaLabel: `Go to ${roleLabel} Login`,
    primaryCtaUrl: roleLoginUrl,
    footerHtml: `Need help? Start at <a href="${escapeHtml(landingUrl)}" style="color:${EMAIL_ACCENT_COLOR};text-decoration:none;">${escapeHtml(
      landingUrl
    )}</a>.`
  });

  return { subject, text, html };
}

function buildForgotPasswordCodeEmail(name, resetCode, role) {
  const safeName = String(name || "User").trim() || "User";
  const safeResetCode = String(resetCode || "").trim();
  const roleLabel = getRoleLabel(role);
  const roleLoginUrl = getRoleLoginUrl(role);
  const subject = `Password Reset Code for your Omni ${roleLabel} account`;
  const text = `Hello ${safeName},

We received a request to reset the password for your Omni ${roleLabel} account.
Use this code to continue:
${safeResetCode}

This code expires in ${FORGOT_PASSWORD_EXPIRY_MINUTES} minutes.
Reset is available from your ${roleLabel} login page: ${roleLoginUrl}

If you did not request a password reset, please ignore this email.

Omni Team`;

  const bodyHtml = `
    <p style="margin:0 0 14px;color:${EMAIL_TEXT_COLOR};font-size:15px;line-height:1.7;">
      We received a request to reset your Omni <strong>${escapeHtml(roleLabel)}</strong> account password.
    </p>
    <div style="margin:0 0 16px;padding:14px;border:1px solid ${EMAIL_BORDER_COLOR};border-radius:10px;background:${EMAIL_BG_COLOR};text-align:center;">
      <p style="margin:0 0 6px;color:${EMAIL_MUTED_TEXT_COLOR};font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">Password Reset Code</p>
      <p style="margin:0;color:${EMAIL_TEXT_COLOR};font-size:30px;font-weight:700;letter-spacing:8px;">${escapeHtml(safeResetCode)}</p>
    </div>
    <p style="margin:0 0 10px;color:${EMAIL_TEXT_COLOR};font-size:14px;line-height:1.7;">
      This code expires in <strong>${FORGOT_PASSWORD_EXPIRY_MINUTES} minutes</strong>.
    </p>
    <p style="margin:0;color:${EMAIL_MUTED_TEXT_COLOR};font-size:13px;line-height:1.7;">
      If you did not request this reset, you can ignore this email and your password will remain unchanged.
    </p>
  `;

  const html = buildEmailShell({
    preheader: "Use this code to reset your Omni account password.",
    heading: "Reset Your Password",
    greetingName: safeName,
    bodyHtml,
    primaryCtaLabel: `Open ${roleLabel} Login`,
    primaryCtaUrl: roleLoginUrl,
    footerHtml: "For security, Omni never sends your existing password by email."
  });

  return { subject, text, html };
}

function buildPasswordResetSuccessEmail(name, role) {
  const safeName = String(name || "User").trim() || "User";
  const roleLabel = getRoleLabel(role);
  const roleLoginUrl = getRoleLoginUrl(role);
  const subject = `Password Updated Successfully - Omni ${roleLabel}`;
  const text = `Hello ${safeName},

Your Omni ${roleLabel} account password has been updated successfully.
You can now log in with your new password:
${roleLoginUrl}

If you did not make this change, contact support immediately.

Omni Team`;

  const bodyHtml = `
    <p style="margin:0 0 14px;color:${EMAIL_TEXT_COLOR};font-size:15px;line-height:1.7;">
      Your Omni <strong>${escapeHtml(roleLabel)}</strong> account password has been changed successfully.
    </p>
    <p style="margin:0;color:${EMAIL_MUTED_TEXT_COLOR};font-size:13px;line-height:1.7;">
      If this was not you, secure your account immediately and contact support.
    </p>
  `;

  const html = buildEmailShell({
    preheader: "Your Omni password was updated successfully.",
    heading: "Password Updated",
    greetingName: safeName,
    bodyHtml,
    primaryCtaLabel: `Go to ${roleLabel} Login`,
    primaryCtaUrl: roleLoginUrl,
    footerHtml: "This is an automated security notification from Omni."
  });

  return { subject, text, html };
}

async function createOrRestoreUserFromPendingSignup(pendingSignup) {
  const email = normalizeEmail(pendingSignup?.email);
  const role = normalizeRole(pendingSignup?.role);
  const normalizedBrokerCode = safeNormalizeBrokerCode(pendingSignup?.brokerCode);

  let linkedBroker = null;
  if (role === "worker" && normalizedBrokerCode) {
    linkedBroker = await findBrokerByCode(normalizedBrokerCode);
    if (!linkedBroker) {
      const error = new Error("Referral code not found.");
      error.statusCode = 404;
      throw error;
    }
  }

  const existing = await User.findOne({ email, role });
  if (existing && !existing.deletedCredentialsAt) {
    const error = new Error("Email already registered for this role.");
    error.statusCode = 409;
    throw error;
  }

  if (existing) {
    existing.name = pendingSignup.name;
    existing.passwordHash = pendingSignup.passwordHash;
    existing.deletedCredentialsAt = null;
    existing.lastLoginAt = new Date();

    if (role === "worker") {
      if (linkedBroker) {
        if (!existing.workerProfile) {
          existing.workerProfile = {};
        }
        existing.workerProfile.brokerCode = linkedBroker.code;
        existing.workerProfile.brokerId = linkedBroker.id;
      }
      if (!existing.workerProfile) {
        existing.workerProfile = {};
      }
      existing.workerProfile.isAvailable = true;
    }

    await ensureBrokerCodeForUser(existing);
    await existing.save();
    await syncUserFamilyByEmail(existing);
    return { user: existing, restoredCredentials: true };
  }

  const payload = {
    name: pendingSignup.name,
    email,
    passwordHash: pendingSignup.passwordHash,
    role
  };

  if (role === "worker" && linkedBroker) {
    payload.workerProfile = {
      brokerCode: linkedBroker.code,
      brokerId: linkedBroker.id
    };
  }
  if (role === "broker") {
    payload.brokerProfile = {
      brokerCode: await generateUniqueBrokerCode()
    };
  }

  const user = await User.create(payload);
  await syncUserFamilyByEmail(user);
  return { user, restoredCredentials: false };
}

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
