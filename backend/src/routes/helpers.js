import jwt from "jsonwebtoken";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { toAvailableWorkerDto, toProfileDto, normalizeBrokerCode } from "../schemas/profile.js";
const JWT_SECRET = process.env.JWT_SECRET || "omni-dev-secret";
const JWT_EXPIRES_IN = "7d";
const CUSTOMER_CANCEL_WINDOW_MS = 10 * 60 * 1000;
const CUSTOMER_CANCELLABLE_STATUSES = new Set(["pending", "confirmed", "upcoming"]);
const CUSTOMER_PAYMENT_ELIGIBLE_STATUSES = new Set(["pending", "confirmed", "upcoming", "in-progress"]);
const CUSTOMER_NOT_PROVIDED_ELIGIBLE_STATUSES = new Set(["pending", "confirmed", "upcoming", "in-progress"]);
const CUSTOMER_REVIEW_ELIGIBLE_STATUSES = new Set(["confirmed", "in-progress", "completed", "not-provided"]);
const BROKER_CODE_LENGTH = 6;
const BROKER_CODE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BROKER_COMMISSION_RATE_PERCENT = 5;
const WORKER_BROKER_COMMISSION_JOB_LIMIT = 10;
const ACTIVE_BOOKING_STATUSES = new Set(["pending", "in-progress", "confirmed", "upcoming"]);

function normalizeForCompare(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function safeNormalizeBrokerCode(value) {
  try {
    return normalizeBrokerCode(value);
  } catch (_error) {
    return "";
  }
}

function generateBrokerCode() {
  let code = "";
  for (let i = 0; i < BROKER_CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * BROKER_CODE_CHARSET.length);
    code += BROKER_CODE_CHARSET[index];
  }
  return code;
}

async function generateUniqueBrokerCode(excludeUserId = null) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const nextCode = generateBrokerCode();
    const filter = {
      role: "broker",
      "brokerProfile.brokerCode": nextCode
    };
    if (excludeUserId) {
      filter._id = { $ne: excludeUserId };
    }

    const existing = await User.findOne(filter).select({ _id: 1 }).lean();
    if (!existing) {
      return nextCode;
    }
  }

  const error = new Error("Unable to generate a unique broker code. Please try again.");
  error.statusCode = 500;
  throw error;
}

async function ensureBrokerCodeForUser(user) {
  if (!user || user.role !== "broker") {
    return user;
  }

  const currentCode = safeNormalizeBrokerCode(user.brokerProfile?.brokerCode);
  if (currentCode) {
    if (!user.brokerProfile) {
      user.brokerProfile = {};
    }
    if (user.brokerProfile.brokerCode !== currentCode) {
      user.brokerProfile.brokerCode = currentCode;
      await user.save();
    }
    return user;
  }

  if (!user.brokerProfile) {
    user.brokerProfile = {};
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      user.brokerProfile.brokerCode = await generateUniqueBrokerCode(user._id);
      await user.save();
      return user;
    } catch (error) {
      if (error?.code === 11000) {
        continue;
      }
      throw error;
    }
  }

  const error = new Error("Unable to generate broker code. Please try again.");
  error.statusCode = 500;
  throw error;
}

async function findBrokerByCode(code) {
  const normalizedCode = safeNormalizeBrokerCode(code);
  if (!normalizedCode) {
    return null;
  }

  const broker = await User.findOne({
    role: "broker",
    "brokerProfile.brokerCode": normalizedCode
  })
    .select({ _id: 1, name: 1, brokerProfile: 1 })
    .lean();

  if (!broker) {
    return null;
  }

  return {
    id: broker._id,
    name: broker.name,
    code: safeNormalizeBrokerCode(broker.brokerProfile?.brokerCode)
  };
}

async function getLinkedBrokerForWorker(worker) {
  const workerBrokerId = worker?.workerProfile?.brokerId;
  if (workerBrokerId) {
    const broker = await User.findOne({
      _id: workerBrokerId,
      role: "broker"
    }).select({ _id: 1, name: 1, brokerProfile: 1 });
    if (broker) {
      await ensureBrokerCodeForUser(broker);
    }
    const brokerCode = safeNormalizeBrokerCode(broker?.brokerProfile?.brokerCode);
    if (broker && brokerCode) {
      return {
        id: broker._id,
        name: broker.name,
        code: brokerCode
      };
    }
  }

  return findBrokerByCode(worker?.workerProfile?.brokerCode);
}

async function findAssignedWorkerForBooking(booking) {
  if (!booking) {
    return null;
  }

  if (booking.workerId) {
    const workerById = await User.findOne({ _id: booking.workerId, role: "worker" }).select({
      _id: 1,
      name: 1,
      role: 1,
      workerProfile: 1
    });
    if (workerById) {
      return workerById;
    }
  }

  const workerEmail = String(booking.workerEmail || "")
    .trim()
    .toLowerCase();
  if (workerEmail) {
    const workerByEmail = await User.findOne({ role: "worker", email: workerEmail }).select({
      _id: 1,
      name: 1,
      role: 1,
      email: 1,
      workerProfile: 1
    });
    if (workerByEmail) {
      return workerByEmail;
    }
  }

  const workerName = String(booking.workerName || "").trim();
  if (!workerName) {
    return null;
  }

  return User.findOne({ role: "worker", name: workerName })
    .sort({ updatedAt: -1, createdAt: -1 })
    .select({ _id: 1, name: 1, role: 1, email: 1, workerProfile: 1 });
}

function workerHasLinkedBroker(worker) {
  return Boolean(
    (worker?.workerProfile?.brokerId && String(worker.workerProfile.brokerId).trim()) ||
      safeNormalizeBrokerCode(worker?.workerProfile?.brokerCode)
  );
}

function getWorkerIdentityScope(worker) {
  const scope = [];
  if (worker?._id) {
    scope.push({ workerId: worker._id });
  }
  const workerName = String(worker?.name || "").trim();
  if (workerName) {
    scope.push({ workerName });
  }
  const workerEmail = String(worker?.email || "")
    .trim()
    .toLowerCase();
  if (workerEmail) {
    scope.push({ workerEmail });
  }
  return scope;
}

async function getWorkerBrokerCommissionProgress(worker) {
  const limit = WORKER_BROKER_COMMISSION_JOB_LIMIT;
  if (!worker || (worker.role && worker.role !== "worker") || !workerHasLinkedBroker(worker)) {
    return {
      usedJobs: 0,
      jobLimit: limit,
      remainingJobs: limit,
      usageLabel: `0/${limit}`,
      isLimitReached: false
    };
  }

  const workerScope = getWorkerIdentityScope(worker);
  if (!workerScope.length) {
    return {
      usedJobs: 0,
      jobLimit: limit,
      remainingJobs: limit,
      usageLabel: `0/${limit}`,
      isLimitReached: false
    };
  }

  const brokerScope = [];
  if (worker.workerProfile?.brokerId) {
    brokerScope.push({ brokerId: worker.workerProfile.brokerId });
  }
  const brokerCode = safeNormalizeBrokerCode(worker.workerProfile?.brokerCode);
  if (brokerCode) {
    brokerScope.push({ brokerCode });
  }

  const usedJobsCount = await Booking.countDocuments({
    status: "completed",
    $and: [
      { $or: workerScope },
      ...(brokerScope.length ? [{ $or: brokerScope }] : []),
      { $or: [{ brokerCommissionAmount: { $gt: 0 } }, { brokerCommissionRate: { $gt: 0 } }] }
    ]
  });

  const usedJobs = Math.min(limit, usedJobsCount);
  const remainingJobs = Math.max(0, limit - usedJobs);
  return {
    usedJobs,
    jobLimit: limit,
    remainingJobs,
    usageLabel: `${usedJobs}/${limit}`,
    isLimitReached: usedJobs >= limit
  };
}

async function ensureBookingBrokerAttribution(booking) {
  if (!booking) {
    return booking;
  }

  const hasBrokerId = Boolean(booking.brokerId && String(booking.brokerId).trim());
  const hasBrokerCode = Boolean(safeNormalizeBrokerCode(booking.brokerCode));
  if (hasBrokerId && hasBrokerCode) {
    return booking;
  }

  const worker = await findAssignedWorkerForBooking(booking);
  if (!worker) {
    return booking;
  }

  const linkedBroker = await getLinkedBrokerForWorker(worker);
  if (!linkedBroker) {
    return booking;
  }

  booking.brokerId = linkedBroker.id;
  booking.brokerCode = linkedBroker.code;
  booking.brokerName = linkedBroker.name || "Omni Broker";
  return booking;
}

async function getWorkersLinkedToBroker(brokerUser) {
  if (!brokerUser || brokerUser.role !== "broker") {
    return { brokerCode: "", workers: [], workerIds: [], workerNames: [], workerEmails: [] };
  }

  const brokerCode = safeNormalizeBrokerCode(brokerUser.brokerProfile?.brokerCode);
  const workerFilter = {
    role: "worker",
    $or: [{ "workerProfile.brokerId": brokerUser._id }, ...(brokerCode ? [{ "workerProfile.brokerCode": brokerCode }] : [])]
  };

  const workers = await User.find(workerFilter).sort({ updatedAt: -1, createdAt: -1 }).lean();
  const workerIds = workers.map((worker) => worker._id);
  const workerNames = workers.map((worker) => worker.name).filter(Boolean);
  const workerEmails = workers.map((worker) => String(worker.email || "").trim().toLowerCase()).filter(Boolean);

  return { brokerCode, workers, workerIds, workerNames, workerEmails };
}

function buildWorkerBookingScope(workerIds = [], workerNames = [], workerEmails = []) {
  const scope = [];
  if (workerIds.length) {
    scope.push({ workerId: { $in: workerIds } });
  }
  if (workerNames.length) {
    scope.push({ workerName: { $in: workerNames } });
  }
  if (workerEmails.length) {
    scope.push({ workerEmail: { $in: workerEmails } });
  }
  return scope;
}

function bookingHasCommissionableBroker(booking) {
  if (!booking) {
    return false;
  }

  if (booking.brokerId && String(booking.brokerId).trim()) {
    return true;
  }

  if (safeNormalizeBrokerCode(booking.brokerCode)) {
    return true;
  }

  const brokerName = normalizeForCompare(booking.brokerName);
  return Boolean(brokerName && brokerName !== "omni broker");
}

function getBookingTotalAmount(booking) {
  const originalAmount = Number(booking?.originalAmount);
  if (Number.isFinite(originalAmount) && originalAmount > 0) {
    return originalAmount;
  }

  const amount = Number(booking?.amount);
  const discountAmount = Number(booking?.discountAmount);
  if (Number.isFinite(amount) && amount >= 0 && Number.isFinite(discountAmount) && discountAmount >= 0) {
    return amount + discountAmount;
  }

  if (Number.isFinite(amount) && amount > 0) {
    return amount;
  }

  return 0;
}

function getBookingDiscountAmount(booking, totalAmount = getBookingTotalAmount(booking)) {
  const explicitDiscount = Number(booking?.discountAmount);
  if (Number.isFinite(explicitDiscount) && explicitDiscount >= 0) {
    return Math.round(explicitDiscount);
  }

  const configuredPercent = Number(booking?.discountPercent);
  if (Number.isFinite(configuredPercent) && configuredPercent > 0 && totalAmount > 0) {
    return Math.round(totalAmount * (configuredPercent / 100));
  }

  return 0;
}

function calculateBrokerCommissionAmount(booking, options = {}) {
  const forceCommission = options.forceCommission === true;
  if (!forceCommission && !bookingHasCommissionableBroker(booking)) {
    return 0;
  }

  const totalAmount = getBookingTotalAmount(booking);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return 0;
  }

  const persistedAmount = Number(booking?.brokerCommissionAmount);
  if (Number.isFinite(persistedAmount) && persistedAmount > 0) {
    return Math.round(persistedAmount);
  }

  const configuredRate = Number(booking?.brokerCommissionRate);
  const commissionRate =
    Number.isFinite(configuredRate) && configuredRate >= 0 ? configuredRate : BROKER_COMMISSION_RATE_PERCENT;
  return Math.round(totalAmount * (commissionRate / 100));
}

function bookingHasAppliedCommission(booking) {
  const persistedAmount = Number(booking?.brokerCommissionAmount);
  if (Number.isFinite(persistedAmount) && persistedAmount > 0) {
    return true;
  }

  const configuredRate = Number(booking?.brokerCommissionRate);
  return Number.isFinite(configuredRate) && configuredRate > 0;
}

function calculateWorkerNetEarning(booking, options = {}) {
  const totalAmount = getBookingTotalAmount(booking);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return 0;
  }

  const discountAmount = getBookingDiscountAmount(booking, totalAmount);
  const brokerCommission = calculateBrokerCommissionAmount(booking, options);
  return Math.max(0, totalAmount - discountAmount - brokerCommission);
}

function bookingBelongsToWorkerScope(booking, workerIdSet, workerNameSet, workerEmailSet = new Set()) {
  if (!booking) {
    return false;
  }

  if (booking.workerId && workerIdSet.has(String(booking.workerId))) {
    return true;
  }

  const normalizedWorkerName = normalizeForCompare(booking.workerName);
  if (normalizedWorkerName && workerNameSet.has(normalizedWorkerName)) {
    return true;
  }

  const normalizedWorkerEmail = normalizeForCompare(booking.workerEmail);
  return Boolean(normalizedWorkerEmail && workerEmailSet.has(normalizedWorkerEmail));
}

async function expireTimedOutPendingBookings(filter = {}) {
  const cutoff = new Date(Date.now() - CUSTOMER_CANCEL_WINDOW_MS);
  await Booking.updateMany(
    {
      status: "pending",
      createdAt: { $lte: cutoff },
      ...filter
    },
    {
      $set: { status: "failed" }
    }
  );
}

function toAuthUser(user) {
  const { profile } = toProfileDto(user);
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
    profile
  };
}

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function extractBearerToken(req) {
  const value = req.headers.authorization || "";
  const [type, token] = value.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) {
    return "";
  }
  return token;
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function requireAuth(req, res, next) {
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

    req.authUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function readAuthUserFromRequest(req) {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      return null;
    }
    await ensureBrokerCodeForUser(user);
    return user || null;
  } catch (_error) {
    return null;
  }
}

function buildWorkerBookingSummary(bookings) {
  const summaryMap = new Map();

  bookings.forEach((booking) => {
    const key = booking.workerName;
    if (!key) {
      return;
    }

    const current = summaryMap.get(key) || { completedJobs: 0, ratings: [] };
    if (booking.status === "completed") {
      current.completedJobs += 1;
      if (typeof booking.rating === "number") {
        current.ratings.push(booking.rating);
      }
    }

    summaryMap.set(key, current);
  });

  for (const [name, current] of summaryMap.entries()) {
    const averageRating = current.ratings.length
      ? Number((current.ratings.reduce((sum, value) => sum + value, 0) / current.ratings.length).toFixed(1))
      : 0;
    summaryMap.set(name, {
      completedJobs: current.completedJobs,
      averageRating
    });
  }

  return summaryMap;
}

async function getAvailableWorkers(limit = 0) {
  const query = User.find({
    role: "worker",
    $or: [{ "workerProfile.isAvailable": true }, { "workerProfile.isAvailable": { $exists: false } }]
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  if (limit > 0) {
    query.limit(limit);
  }

  const workers = await query;
  if (!workers.length) {
    return [];
  }

  const workerNames = workers.map((worker) => worker.name);
  const bookings = await Booking.find({
    workerName: { $in: workerNames }
  })
    .select({ workerName: 1, status: 1, rating: 1 })
    .lean();

  const summaryByName = buildWorkerBookingSummary(bookings);
  return workers.map((worker) => toAvailableWorkerDto(worker, summaryByName.get(worker.name)));
}

function workerProvidesService(worker, service) {
  const target = normalizeForCompare(service);
  if (!target) {
    return false;
  }

  const provided = Array.isArray(worker.workerProfile?.servicesProvided) ? worker.workerProfile.servicesProvided : [];
  return provided.some((item) => normalizeForCompare(item) === target);
}

function bookingAssignedToWorker(booking, worker) {
  if (!booking || !worker) {
    return false;
  }

  const bookingWorkerId = booking.workerId ? String(booking.workerId) : "";
  const workerId = worker._id ? String(worker._id) : "";
  if (bookingWorkerId && workerId && bookingWorkerId === workerId) {
    return true;
  }

  const bookingWorkerName = normalizeForCompare(booking.workerName);
  const workerName = normalizeForCompare(worker.name);
  if (bookingWorkerName && workerName && bookingWorkerName === workerName) {
    return true;
  }

  const bookingWorkerEmail = normalizeForCompare(booking.workerEmail);
  const workerEmail = normalizeForCompare(worker.email);
  return Boolean(bookingWorkerEmail && workerEmail && bookingWorkerEmail === workerEmail);
}

function bookingHasAssignedWorker(booking) {
  return Boolean((booking?.workerId && String(booking.workerId)) || normalizeForCompare(booking?.workerName));
}

function bookingRejectedByWorker(booking, workerId) {
  const rejectedIds = Array.isArray(booking?.rejectedByWorkerIds) ? booking.rejectedByWorkerIds : [];
  const normalizedWorkerId = String(workerId || "");
  return rejectedIds.some((value) => String(value) === normalizedWorkerId);
}

function pendingBookingVisibleToWorker(booking, worker) {
  if (!booking || !worker || booking.status !== "pending") {
    return false;
  }
  if (bookingAssignedToWorker(booking, worker)) {
    return true;
  }
  if (bookingHasAssignedWorker(booking)) {
    return false;
  }
  if (bookingRejectedByWorker(booking, worker._id)) {
    return false;
  }
  return workerProvidesService(worker, booking.service);
}

function isLikelyObjectId(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value || ""));
}

export {
  ACTIVE_BOOKING_STATUSES,
  BROKER_COMMISSION_RATE_PERCENT,
  CUSTOMER_CANCEL_WINDOW_MS,
  CUSTOMER_CANCELLABLE_STATUSES,
  CUSTOMER_NOT_PROVIDED_ELIGIBLE_STATUSES,
  CUSTOMER_PAYMENT_ELIGIBLE_STATUSES,
  CUSTOMER_REVIEW_ELIGIBLE_STATUSES,
  bookingAssignedToWorker,
  bookingBelongsToWorkerScope,
  bookingHasAssignedWorker,
  buildWorkerBookingScope,
  buildWorkerBookingSummary,
  bookingHasAppliedCommission,
  calculateBrokerCommissionAmount,
  calculateWorkerNetEarning,
  ensureBookingBrokerAttribution,
  ensureBrokerCodeForUser,
  expireTimedOutPendingBookings,
  findAssignedWorkerForBooking,
  extractBearerToken,
  findBrokerByCode,
  getAvailableWorkers,
  getBookingTotalAmount,
  getWorkerBrokerCommissionProgress,
  getLinkedBrokerForWorker,
  getWorkersLinkedToBroker,
  isLikelyObjectId,
  normalizeForCompare,
  pendingBookingVisibleToWorker,
  readAuthUserFromRequest,
  requireAuth,
  safeNormalizeBrokerCode,
  signToken,
  toAuthUser,
  verifyToken,
  workerProvidesService,
  generateUniqueBrokerCode
};
