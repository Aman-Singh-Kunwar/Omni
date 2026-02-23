import crypto from "crypto";
import PendingSignup from "../../../models/PendingSignup.js";
import PendingPasswordReset from "../../../models/PendingPasswordReset.js";
import { sendMail } from "../../../utils/mailer.js";
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
} from "../shared.js";

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
  return `${getRoleAppBaseUrl(role)}/#/login`;
}

function getRoleSignupUrl(role) {
  return `${getRoleAppBaseUrl(role)}/#/signup`;
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

export {
  PendingSignup,
  PendingPasswordReset,
  sendMail,
  bcrypt,
  User,
  ensureBrokerCodeForUser,
  extractBearerToken,
  findBrokerByCode,
  isGmailAddress,
  logger,
  safeNormalizeBrokerCode,
  signToken,
  syncUserFamilyByEmail,
  toAuthUser,
  verifyToken,
  SIGNUP_VERIFICATION_MAX_ATTEMPTS,
  FORGOT_PASSWORD_MAX_ATTEMPTS,
  normalizeEmail,
  normalizeRole,
  normalizeVerificationCode,
  generateVerificationCode,
  hashVerificationCode,
  getVerificationExpiryDate,
  isVerificationExpired,
  generateForgotPasswordCode,
  hashForgotPasswordCode,
  getForgotPasswordExpiryDate,
  isForgotPasswordExpired,
  buildSignupVerificationEmail,
  buildSignupSuccessEmail,
  buildForgotPasswordCodeEmail,
  buildPasswordResetSuccessEmail,
  createOrRestoreUserFromPendingSignup
};
