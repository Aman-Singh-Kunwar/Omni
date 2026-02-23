import Booking from "../../models/Booking.js";
import { BROKER_COMMISSION_RATE_PERCENT, CUSTOMER_CANCEL_WINDOW_MS } from "./constants.js";
import { normalizeForCompare, safeNormalizeBrokerCode } from "./common.js";
import { findAssignedWorkerForBooking, getLinkedBrokerForWorker } from "./broker.js";

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

export {
  bookingBelongsToWorkerScope,
  bookingHasAppliedCommission,
  calculateBrokerCommissionAmount,
  calculateWorkerNetEarning,
  ensureBookingBrokerAttribution,
  expireTimedOutPendingBookings,
  getBookingTotalAmount
};
