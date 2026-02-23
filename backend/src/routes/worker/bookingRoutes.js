import express from "express";
import Booking from "../../models/Booking.js";
import { emitBookingRealtimeEvent } from "../../realtime/bookingEvents.js";
import {
  BROKER_COMMISSION_RATE_PERCENT,
  bookingAssignedToWorker,
  bookingHasAssignedWorker,
  expireTimedOutPendingBookings,
  getLinkedBrokerForWorker,
  isLikelyObjectId,
  pendingBookingVisibleToWorker,
  requireAuth,
  workerProvidesService
} from "../helpers.js";

const router = express.Router();

router.patch("/worker/bookings/:bookingId", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser.role !== "worker") {
      return res.status(403).json({ message: "Only workers can update job requests." });
    }

    const action = String(req.body?.action || "")
      .trim()
      .toLowerCase();
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be either 'accept' or 'reject'." });
    }
    if (!isLikelyObjectId(req.params.bookingId)) {
      return res.status(400).json({ message: "Invalid booking id." });
    }

    await expireTimedOutPendingBookings({ _id: req.params.bookingId });
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found for this worker." });
    }

    const isAssignedToCurrentWorker = bookingAssignedToWorker(booking, req.authUser);
    const isVisiblePendingRequest = pendingBookingVisibleToWorker(booking, req.authUser);
    if (!isAssignedToCurrentWorker && !isVisiblePendingRequest) {
      return res.status(404).json({ message: "Booking not found for this worker." });
    }

    if (booking.status !== "pending") {
      return res.status(409).json({ message: `Cannot ${action} a booking that is already ${booking.status}.` });
    }

    if (action === "accept") {
      if (!workerProvidesService(req.authUser, booking.service)) {
        return res.status(403).json({ message: "You cannot accept a service you do not provide." });
      }
      if (bookingHasAssignedWorker(booking) && !isAssignedToCurrentWorker) {
        return res.status(409).json({ message: "This booking has already been accepted by another worker." });
      }
      const linkedBroker = await getLinkedBrokerForWorker(req.authUser);

      booking.workerId = req.authUser._id;
      booking.workerName = req.authUser.name;
      booking.workerEmail = req.authUser.email || "";
      booking.workerPhone = req.authUser.workerProfile?.phone || "";
      booking.workerServices = Array.isArray(req.authUser.workerProfile?.servicesProvided)
        ? req.authUser.workerProfile.servicesProvided
        : [];
      booking.rejectedByWorkerIds = [];
      booking.brokerId = linkedBroker?.id;
      booking.brokerCode = linkedBroker?.code || "";
      booking.brokerName = linkedBroker?.name || "Omni Broker";
      booking.brokerCommissionRate = BROKER_COMMISSION_RATE_PERCENT;
      booking.brokerCommissionAmount = 0;
      booking.status = "confirmed";
    } else if (isAssignedToCurrentWorker && bookingHasAssignedWorker(booking)) {
      booking.status = "cancelled";
    } else {
      const rejectedBy = Array.isArray(booking.rejectedByWorkerIds)
        ? booking.rejectedByWorkerIds.map((value) => String(value))
        : [];
      const currentWorkerId = String(req.authUser._id);
      if (!rejectedBy.includes(currentWorkerId)) {
        booking.rejectedByWorkerIds = [...rejectedBy, currentWorkerId];
      }
    }

    await booking.save();
    if (action === "accept") {
      emitBookingRealtimeEvent(booking, { action: "accepted", audience: "all" });
    } else if (isAssignedToCurrentWorker && bookingHasAssignedWorker(booking)) {
      emitBookingRealtimeEvent(booking, { action: "cancelled-by-worker", audience: "all" });
    } else {
      emitBookingRealtimeEvent(booking, { action: "rejected", audience: "worker" });
    }

    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

export default router;
