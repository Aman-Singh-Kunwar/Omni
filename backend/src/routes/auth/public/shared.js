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
import {
  buildSignupVerificationEmail,
  buildSignupSuccessEmail,
  buildForgotPasswordCodeEmail,
  buildPasswordResetSuccessEmail
} from "./emailTemplates.js";

// ── OTP / verification constants ──────────────────────────────────────────────

const SIGNUP_VERIFICATION_CODE_LENGTH    = 6;
const SIGNUP_VERIFICATION_EXPIRY_MINUTES = Math.max(1, Number(process.env.SIGNUP_VERIFICATION_EXPIRY_MINUTES || 10));
const SIGNUP_VERIFICATION_MAX_ATTEMPTS   = 5;
const SIGNUP_VERIFICATION_SECRET         = String(
  process.env.SIGNUP_VERIFICATION_SECRET || process.env.JWT_SECRET || "omni-signup-verification-secret"
).trim();

const FORGOT_PASSWORD_CODE_LENGTH    = 6;
const FORGOT_PASSWORD_EXPIRY_MINUTES = Math.max(1, Number(process.env.FORGOT_PASSWORD_EXPIRY_MINUTES || 10));
const FORGOT_PASSWORD_MAX_ATTEMPTS   = 5;
const FORGOT_PASSWORD_SECRET         = String(
  process.env.FORGOT_PASSWORD_SECRET || process.env.SIGNUP_VERIFICATION_SECRET || process.env.JWT_SECRET || "omni-forgot-password-secret"
).trim();

// ── normalizers ───────────────────────────────────────────────────────────────

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

// ── OTP generators ────────────────────────────────────────────────────────────

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

// ── OTP hashers ───────────────────────────────────────────────────────────────

function hashVerificationCode({ email, role, code }) {
  return crypto
    .createHash("sha256")
    .update(`${SIGNUP_VERIFICATION_SECRET}|${normalizeEmail(email)}|${normalizeRole(role)}|${normalizeVerificationCode(code)}`)
    .digest("hex");
}

function hashForgotPasswordCode({ email, role, code }) {
  return crypto
    .createHash("sha256")
    .update(`${FORGOT_PASSWORD_SECRET}|${normalizeEmail(email)}|${normalizeRole(role)}|${normalizeVerificationCode(code)}`)
    .digest("hex");
}

// ── expiry helpers ────────────────────────────────────────────────────────────

function getVerificationExpiryDate()         { return new Date(Date.now() + SIGNUP_VERIFICATION_EXPIRY_MINUTES * 60 * 1000); }
function isVerificationExpired(expiresAt)     { return !expiresAt || new Date(expiresAt).getTime() <= Date.now(); }
function getForgotPasswordExpiryDate()        { return new Date(Date.now() + FORGOT_PASSWORD_EXPIRY_MINUTES  * 60 * 1000); }
function isForgotPasswordExpired(expiresAt)   { return !expiresAt || new Date(expiresAt).getTime() <= Date.now(); }

// ── user creation / restore ───────────────────────────────────────────────────

async function createOrRestoreUserFromPendingSignup(pendingSignup) {
  const email                = normalizeEmail(pendingSignup?.email);
  const role                 = normalizeRole(pendingSignup?.role);
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
    existing.name                = pendingSignup.name;
    existing.passwordHash        = pendingSignup.passwordHash;
    existing.deletedCredentialsAt = null;
    existing.lastLoginAt         = new Date();

    if (role === "worker") {
      if (linkedBroker) {
        if (!existing.workerProfile) existing.workerProfile = {};
        existing.workerProfile.brokerCode = linkedBroker.code;
        existing.workerProfile.brokerId   = linkedBroker.id;
      }
      if (!existing.workerProfile) existing.workerProfile = {};
      existing.workerProfile.isAvailable = true;
    }

    await ensureBrokerCodeForUser(existing);
    await existing.save();
    await syncUserFamilyByEmail(existing);
    return { user: existing, restoredCredentials: true };
  }

  const payload = {
    name:         pendingSignup.name,
    email,
    passwordHash: pendingSignup.passwordHash,
    role
  };

  if (role === "worker" && linkedBroker) {
    payload.workerProfile = { brokerCode: linkedBroker.code, brokerId: linkedBroker.id };
  }
  if (role === "broker") {
    payload.brokerProfile = { brokerCode: await generateUniqueBrokerCode() };
  }

  const user = await User.create(payload);
  await syncUserFamilyByEmail(user);
  return { user, restoredCredentials: false };
}

// ── barrel re-export (all callers import only from this file) ─────────────────

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
