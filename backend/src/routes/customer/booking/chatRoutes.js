import express from "express";
import Booking from "../../../models/Booking.js";
import { isLikelyObjectId, requireAuth } from "../../helpers.js";

const router = express.Router();

router.get("/bookings/:bookingId/chat", requireAuth, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    if (!isLikelyObjectId(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id." });
    }

    const booking = await Booking.findById(bookingId)
      .select({ customerId: 1, customerName: 1, workerId: 1, workerName: 1, workerEmail: 1, chatMessages: 1 })
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const userId = String(req.authUser._id || req.authUser.id || "");
    const userName = String(req.authUser.name || "").trim().toLowerCase();
    const userEmail = String(req.authUser.email || "").trim().toLowerCase();

    const isCustomer =
      (booking.customerId && String(booking.customerId) === userId) ||
      (booking.customerName && String(booking.customerName).trim().toLowerCase() === userName);

    const isWorker =
      (booking.workerId && String(booking.workerId) === userId) ||
      (booking.workerName && String(booking.workerName).trim().toLowerCase() === userName) ||
      (booking.workerEmail && String(booking.workerEmail).trim().toLowerCase() === userEmail);

    if (!isCustomer && !isWorker) {
      return res.status(403).json({ message: "Access denied." });
    }

    return res.json({ messages: Array.isArray(booking.chatMessages) ? booking.chatMessages : [] });
  } catch (error) {
    return next(error);
  }
});

export default router;
