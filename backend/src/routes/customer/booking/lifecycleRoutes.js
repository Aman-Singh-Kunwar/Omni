import express from "express";
import { emitBookingRealtimeEvent } from "../../../realtime/bookingEvents.js";
import {
  CUSTOMER_CANCELLABLE_STATUSES,
  CUSTOMER_CANCEL_WINDOW_MS,
  CUSTOMER_NOT_PROVIDED_ELIGIBLE_STATUSES,
  bookingHasAssignedWorker,
  requireAuth
} from "../../helpers.js";
import { ensureCustomerRole, findCustomerBooking, validateBookingId } from "./shared.js";

const router = express.Router();

router.patch("/customer/bookings/:bookingId/cancel", requireAuth, async (req, res, next) => {
  try {
    if (!ensureCustomerRole(req, res, "cancel bookings")) {
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

    if (!CUSTOMER_CANCELLABLE_STATUSES.has(booking.status)) {
      return res.status(409).json({ message: `Cannot cancel a booking that is already ${booking.status}.` });
    }

    const createdAtTs = booking.createdAt ? new Date(booking.createdAt).getTime() : NaN;
    const nowTs = Date.now();
    if (!Number.isFinite(createdAtTs) || nowTs - createdAtTs > CUSTOMER_CANCEL_WINDOW_MS) {
      return res.status(409).json({ message: "Cancellation window expired. Bookings can be cancelled within 10 minutes only." });
    }

    booking.status = "cancelled";
    await booking.save();

    emitBookingRealtimeEvent(booking, { action: "cancelled", audience: "all" });
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

router.delete("/customer/bookings/:bookingId", requireAuth, async (req, res, next) => {
  try {
    if (!ensureCustomerRole(req, res, "delete bookings")) {
      return;
    }

    const { bookingId } = req.params;
    if (!validateBookingId(bookingId, res)) {
      return;
    }

    const booking = await findCustomerBooking(req.authUser, bookingId, { includeHidden: true });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found for this customer." });
    }

    if (booking.hiddenForCustomer) {
      return res.json({ ok: true, booking });
    }

    booking.hiddenForCustomer = true;
    booking.hiddenForCustomerAt = new Date();
    await booking.save();
    emitBookingRealtimeEvent(booking, { action: "hidden", audience: "customer" });
    return res.json({ ok: true, booking });
  } catch (error) {
    return next(error);
  }
});

router.patch("/customer/bookings/:bookingId/not-provided", requireAuth, async (req, res, next) => {
  try {
    if (!ensureCustomerRole(req, res, "report service issues")) {
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
      return res.status(409).json({ message: "You can report issue after a worker accepts this booking." });
    }

    if (!CUSTOMER_NOT_PROVIDED_ELIGIBLE_STATUSES.has(booking.status)) {
      return res.status(409).json({ message: `Cannot report issue for a booking that is already ${booking.status}.` });
    }

    booking.status = "not-provided";
    await booking.save();

    emitBookingRealtimeEvent(booking, { action: "not-provided", audience: "all" });
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

export default router;
