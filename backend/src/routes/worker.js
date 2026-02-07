const express = require("express");

const Booking = require("../models/Booking");
const User = require("../models/User");
const {
  BROKER_COMMISSION_RATE_PERCENT,
  bookingAssignedToWorker,
  bookingHasAssignedWorker,
  calculateBrokerCommissionAmount,
  calculateWorkerNetEarning,
  expireTimedOutPendingBookings,
  getLinkedBrokerForWorker,
  isLikelyObjectId,
  pendingBookingVisibleToWorker,
  readAuthUserFromRequest,
  requireAuth,
  safeNormalizeBrokerCode,
  workerProvidesService
} = require("./helpers");

const router = express.Router();

router.get("/worker/dashboard", async (req, res, next) => {
  try {
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
      $or: [{ workerId: worker._id }, { workerName: worker.name }, { status: "pending" }]
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
    const workerHasLinkedBroker = Boolean(
      (worker.workerProfile?.brokerId && String(worker.workerProfile.brokerId).trim()) ||
        safeNormalizeBrokerCode(worker.workerProfile?.brokerCode)
    );
    const recentJobs = completedJobs.slice(0, 6).map((booking) => ({
      ...booking,
      brokerCommissionAmount: calculateBrokerCommissionAmount(booking, { forceCommission: workerHasLinkedBroker }),
      workerPayout: calculateWorkerNetEarning(booking, { forceCommission: workerHasLinkedBroker })
    }));

    const totalEarnings = completedJobs.reduce(
      (sum, booking) => sum + calculateWorkerNetEarning(booking, { forceCommission: workerHasLinkedBroker }),
      0
    );

    const ratings = recentJobs.filter((job) => typeof job.rating === "number").map((job) => job.rating);
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

router.get("/worker/reviews", async (req, res, next) => {
  try {
    const authUser = await readAuthUserFromRequest(req);
    const requestedWorkerName = String(req.query.worker || "").trim();
    const isAuthWorker = authUser?.role === "worker";
    if (!isAuthWorker && !requestedWorkerName) {
      return res.json({ reviews: [] });
    }

    const workerFilter = isAuthWorker
      ? {
          $or: [{ workerId: authUser._id }, { workerName: authUser.name }]
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

    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
