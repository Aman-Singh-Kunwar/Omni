import express from "express";
import Booking from "../../../models/Booking.js";
import User from "../../../models/User.js";
import { emitBookingRealtimeEvent } from "../../../realtime/bookingEvents.js";
import { requireAuth, workerProvidesService } from "../../helpers.js";
import { ensureCustomerRole } from "./shared.js";

const router = express.Router();

router.post("/bookings", requireAuth, async (req, res, next) => {
  try {
    if (!ensureCustomerRole(req, res, "create bookings")) {
      return;
    }

    const payload = req.body || {};
    const service = String(payload.service || "").trim();
    const date = String(payload.date || "").trim();
    const time = String(payload.time || "").trim();

    if (!service || !date || !time) {
      return res.status(400).json({ message: "service, date, and time are required to create a booking." });
    }

    const availableWorkers = await User.find({
      role: "worker",
      $or: [{ "workerProfile.isAvailable": true }, { "workerProfile.isAvailable": { $exists: false } }]
    })
      .select({ _id: 1, workerProfile: 1 })
      .lean();
    const eligibleWorkers = availableWorkers.filter((worker) => workerProvidesService(worker, service));
    if (!eligibleWorkers.length) {
      return res.status(409).json({ message: "No workers are currently available for this service." });
    }

    const originalAmount = Number.isFinite(Number(payload.amount)) && Number(payload.amount) > 0 ? Number(payload.amount) : 500;
    let applyDiscount = true;
    if (typeof payload.applyDiscount === "boolean") {
      applyDiscount = payload.applyDiscount;
    } else if (typeof payload.applyDiscount === "string") {
      applyDiscount = payload.applyDiscount.trim().toLowerCase() !== "false";
    }

    const discountPercent = applyDiscount ? 5 : 0;
    const discountAmount = applyDiscount ? Math.round(originalAmount * (discountPercent / 100)) : 0;
    const finalAmount = Math.max(0, originalAmount - discountAmount);

    const booking = await Booking.create({
      service,
      customerId: req.authUser._id,
      customerName: req.authUser.name,
      workerName: "",
      workerEmail: "",
      workerPhone: "",
      workerServices: [],
      rejectedByWorkerIds: [],
      brokerName: String(payload.brokerName || "").trim() || "Omni Broker",
      location: String(payload.location || "").trim(),
      description: String(payload.description || "").trim(),
      date,
      time,
      status: "pending",
      amount: finalAmount,
      originalAmount,
      discountPercent,
      discountAmount,
      rating: payload.rating
    });

    emitBookingRealtimeEvent(booking, { action: "created", audience: "all" });
    return res.status(201).json({ booking });
  } catch (error) {
    return next(error);
  }
});

export default router;
