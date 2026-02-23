import express from "express";
import Booking from "../../models/Booking.js";
import { readAuthUserFromRequest } from "../helpers.js";

const router = express.Router();

router.get("/worker/reviews", async (req, res, next) => {
  try {
    res.set("Cache-Control", "private, max-age=20, stale-while-revalidate=40");
    const authUser = await readAuthUserFromRequest(req);
    const requestedWorkerName = String(req.query.worker || "").trim();
    const isAuthWorker = authUser?.role === "worker";
    if (!isAuthWorker && !requestedWorkerName) {
      return res.json({ reviews: [] });
    }

    const workerFilter = isAuthWorker
      ? {
          $or: [{ workerId: authUser._id }, { workerName: authUser.name }, { workerEmail: authUser.email }]
        }
      : requestedWorkerName
        ? { workerName: requestedWorkerName }
        : {};

    const reviewedBookings = await Booking.find({
      ...workerFilter,
      status: { $in: ["completed", "not-provided"] },
      rating: { $gt: 0 },
      feedback: { $exists: true, $ne: "" }
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const reviews = reviewedBookings.map((booking) => ({
      id: booking._id,
      customer: booking.customerName || "Customer",
      service: booking.service || "Service",
      rating: typeof booking.rating === "number" ? booking.rating : 0,
      feedback: String(booking.feedback || ""),
      amount: Number(booking.amount || 0),
      date: booking.date || "",
      time: booking.time || "",
      createdAt: booking.createdAt
    }));

    return res.json({ reviews });
  } catch (error) {
    return next(error);
  }
});

export default router;
