import express from "express";
import Booking from "../../models/Booking.js";
import User from "../../models/User.js";
import {
  bookingAssignedToWorker,
  calculateBrokerCommissionAmount,
  calculateWorkerNetEarning,
  expireTimedOutPendingBookings,
  pendingBookingVisibleToWorker,
  readAuthUserFromRequest
} from "../helpers.js";

const router = express.Router();

router.get("/worker/dashboard", async (req, res, next) => {
  try {
    res.set("Cache-Control", "private, max-age=20, stale-while-revalidate=40");
    const authUser = await readAuthUserFromRequest(req);
    const requestedWorkerName = String(req.query.worker || "").trim();
    const isAuthWorker = authUser?.role === "worker";
    if (!isAuthWorker && !requestedWorkerName) {
      return res.json({
        stats: {
          totalEarnings: 0,
          completedJobs: 0,
          averageRating: 0,
          pendingRequests: 0
        },
        jobRequests: [],
        scheduleJobs: [],
        recentJobs: []
      });
    }

    const worker = isAuthWorker ? authUser : await User.findOne({ role: "worker", name: requestedWorkerName }).lean();
    if (!worker) {
      return res.json({
        stats: {
          totalEarnings: 0,
          completedJobs: 0,
          averageRating: 0,
          pendingRequests: 0
        },
        jobRequests: [],
        scheduleJobs: [],
        recentJobs: []
      });
    }

    await expireTimedOutPendingBookings();

    const bookings = await Booking.find({
      $or: [{ workerId: worker._id }, { workerName: worker.name }, { workerEmail: worker.email }, { status: "pending" }]
    })
      .sort({ createdAt: -1 })
      .lean();

    const relevantBookings = bookings.filter((booking) => {
      if (bookingAssignedToWorker(booking, worker)) {
        return true;
      }
      return pendingBookingVisibleToWorker(booking, worker);
    });

    const jobRequests = relevantBookings.filter((booking) => pendingBookingVisibleToWorker(booking, worker));
    const scheduleJobs = relevantBookings.filter(
      (booking) => bookingAssignedToWorker(booking, worker) && ["confirmed", "upcoming", "in-progress"].includes(booking.status)
    );
    const completedJobs = relevantBookings.filter(
      (booking) => bookingAssignedToWorker(booking, worker) && booking.status === "completed"
    );
    const recentJobs = completedJobs.map((booking) => ({
      ...booking,
      brokerCommissionAmount: calculateBrokerCommissionAmount(booking),
      workerPayout: calculateWorkerNetEarning(booking)
    }));

    const totalEarnings = completedJobs.reduce((sum, booking) => sum + calculateWorkerNetEarning(booking), 0);

    const ratings = completedJobs.filter((job) => typeof job.rating === "number").map((job) => job.rating);
    const averageRating = ratings.length
      ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1))
      : 0;

    return res.json({
      stats: {
        totalEarnings,
        completedJobs: completedJobs.length,
        averageRating,
        pendingRequests: jobRequests.length
      },
      jobRequests,
      scheduleJobs,
      recentJobs
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
