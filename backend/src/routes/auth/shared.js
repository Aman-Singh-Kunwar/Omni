import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import {
  ensureBrokerCodeForUser,
  extractBearerToken,
  findBrokerByCode,
  generateUniqueBrokerCode,
  requireAuth,
  safeNormalizeBrokerCode,
  signToken,
  toAuthUser,
  verifyToken
} from "../helpers.js";
import logger from "../../utils/logger.js";
import { syncUserFamilyByEmail } from "../../utils/userSync.js";

function isGmailAddress(value) {
  return /^[a-z0-9._%+-]+@gmail\.com$/.test(String(value || "").trim().toLowerCase());
}

export {
  bcrypt,
  User,
  ensureBrokerCodeForUser,
  extractBearerToken,
  findBrokerByCode,
  generateUniqueBrokerCode,
  isGmailAddress,
  logger,
  requireAuth,
  safeNormalizeBrokerCode,
  signToken,
  syncUserFamilyByEmail,
  toAuthUser,
  verifyToken
};
