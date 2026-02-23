import express from "express";
import Booking from "../../models/Booking.js";
import {
  bookingHasAppliedCommission,
  buildWorkerBookingScope,
  calculateBrokerCommissionAmount,
  getBookingTotalAmount,
  getWorkersLinkedToBroker,
  readAuthUserFromRequest
} from "../helpers.js";
import { buildBrokerAttributionScope } from "./shared.js";

const router = express.Router();

router.get("/broker/bookings", async (req, res, next) => {
  try {
    res.set("Cache-Control", "private, max-age=20, stale-while-revalidate=40");
    const authUser = await readAuthUserFromRequest(req);
    if (!authUser || authUser.role !== "broker") {
      return res.json({ brokerCode: "", bookings: [] });
    }

    const { brokerCode, workerIds, workerNames, workerEmails } = await getWorkersLinkedToBroker(authUser);
    const workerScopeFilters = buildWorkerBookingScope(workerIds, workerNames, workerEmails);
    const brokerScopeFilters = buildBrokerAttributionScope(authUser, brokerCode);
    if (!workerScopeFilters.length || !brokerScopeFilters.length) {
      return res.json({ brokerCode, bookings: [] });
    }

    const completedBookings = await Booking.find({
      status: "completed",
      $and: [{ $or: brokerScopeFilters }, { $or: workerScopeFilters }]
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const bookings = completedBookings
      .filter((booking) => bookingHasAppliedCommission(booking))
      .map((booking) => ({
        id: String(booking._id),
        customerName: booking.customerName || "Customer",
        workerName: booking.workerName || "Worker",
        service: booking.service || "Service",
        date: booking.date || "",
        time: booking.time || "",
        amount: getBookingTotalAmount(booking),
        brokerCommission: calculateBrokerCommissionAmount(booking),
        rating: typeof booking.rating === "number" ? booking.rating : 0,
        status: booking.status
      }));

    return res.json({
      brokerCode,
      bookings
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
