import express from "express";
import { emitBookingRealtimeEvent } from "../../../realtime/bookingEvents.js";
import {
  BROKER_COMMISSION_RATE_PERCENT,
  CUSTOMER_CANCEL_WINDOW_MS,
  CUSTOMER_PAYMENT_ELIGIBLE_STATUSES,
  CUSTOMER_REVIEW_ELIGIBLE_STATUSES,
  bookingHasAssignedWorker,
  calculateBrokerCommissionAmount,
  ensureBookingBrokerAttribution,
  findAssignedWorkerForBooking,
  getWorkerBrokerCommissionProgress,
  requireAuth,
  safeNormalizeBrokerCode
} from "../../helpers.js";
import { ensureCustomerRole, findCustomerBooking, validateBookingId } from "./shared.js";

const router = express.Router();

router.patch("/customer/bookings/:bookingId/pay", requireAuth, async (req, res, next) => {
  try {
    if (!ensureCustomerRole(req, res, "trigger payment")) {
      return;
    }

    const { bookingId } = req.params;
    if (!validateBookingId(bookingId, res)) {
      return;
    }

    const booking = await findCustomerBooking(req.authUser, bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found for this customer." });
    }

    if (!bookingHasAssignedWorker(booking)) {
      return res.status(409).json({ message: "Payment is available after a worker accepts this booking." });
    }

    if (!CUSTOMER_PAYMENT_ELIGIBLE_STATUSES.has(booking.status)) {
      return res.status(409).json({ message: `Cannot process payment for a booking that is already ${booking.status}.` });
    }

    const createdAtTs = booking.createdAt ? new Date(booking.createdAt).getTime() : NaN;
    const nowTs = Date.now();
    if (Number.isFinite(createdAtTs) && nowTs - createdAtTs < CUSTOMER_CANCEL_WINDOW_MS) {
      return res.status(409).json({ message: "Payment is enabled after the 10-minute cancellation window." });
    }

    const [, assignedWorker] = await Promise.all([
      ensureBookingBrokerAttribution(booking),
      findAssignedWorkerForBooking(booking)
    ]);
    const workerHasLinkedBroker = Boolean(
      (assignedWorker?.workerProfile?.brokerId && String(assignedWorker.workerProfile.brokerId).trim()) ||
        safeNormalizeBrokerCode(assignedWorker?.workerProfile?.brokerCode)
    );
    let commissionRate = 0;
    if (workerHasLinkedBroker) {
      const progress = await getWorkerBrokerCommissionProgress(assignedWorker);
      commissionRate = progress.isLimitReached ? 0 : BROKER_COMMISSION_RATE_PERCENT;
    }

    booking.status = "completed";
    booking.brokerCommissionRate = commissionRate;
    booking.brokerCommissionAmount =
      commissionRate > 0
        ? calculateBrokerCommissionAmount({
            ...booking.toObject(),
            brokerCommissionAmount: undefined,
            brokerCommissionRate: commissionRate
          })
        : 0;
    await booking.save();

    emitBookingRealtimeEvent(booking, { action: "completed", audience: "all" });
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

router.patch("/customer/bookings/:bookingId/review", requireAuth, async (req, res, next) => {
  try {
    if (!ensureCustomerRole(req, res, "submit reviews")) {
      return;
    }

    const { bookingId } = req.params;
    if (!validateBookingId(bookingId, res)) {
      return;
    }

    const rating = Number(req.body?.rating);
    const feedback = String(req.body?.feedback || "").trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }
    if (!feedback) {
      return res.status(400).json({ message: "Feedback message is required." });
    }
    if (feedback.length > 500) {
      return res.status(400).json({ message: "Feedback cannot exceed 500 characters." });
    }

    const booking = await findCustomerBooking(req.authUser, bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found for this customer." });
    }

    if (!CUSTOMER_REVIEW_ELIGIBLE_STATUSES.has(booking.status)) {
      return res.status(409).json({
        message: "Review can be submitted only for confirmed, in-progress, completed, or not provided bookings."
      });
    }

    booking.rating = rating;
    booking.feedback = feedback;
    await booking.save();

    emitBookingRealtimeEvent(booking, { action: "reviewed", audience: "all" });
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

export default router;
