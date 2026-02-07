const express = require("express");

const Booking = require("../models/Booking");
const Service = require("../models/Service");
const User = require("../models/User");
const {
  BROKER_COMMISSION_RATE_PERCENT,
  CUSTOMER_CANCELLABLE_STATUSES,
  CUSTOMER_CANCEL_WINDOW_MS,
  CUSTOMER_NOT_PROVIDED_ELIGIBLE_STATUSES,
  CUSTOMER_PAYMENT_ELIGIBLE_STATUSES,
  CUSTOMER_REVIEW_ELIGIBLE_STATUSES,
  bookingAssignedToWorker,
  bookingHasAssignedWorker,
  calculateBrokerCommissionAmount,
  ensureBookingBrokerAttribution,
  expireTimedOutPendingBookings,
  getAvailableWorkers,
  isLikelyObjectId,
  readAuthUserFromRequest,
  requireAuth,
  workerProvidesService
} = require("./helpers");

const router = express.Router();

router.get("/customer/dashboard", async (req, res, next) => {
  try {
    const authUser = await readAuthUserFromRequest(req);
    const requestedCustomerName = String(req.query.customer || "").trim();
    const isAuthCustomer = authUser?.role === "customer";
    if (!isAuthCustomer && !requestedCustomerName) {
      return res.json({
        stats: {
          totalBookings: 0,
          completed: 0,
          upcoming: 0,
          moneySaved: 0
        },
        services: [],
        recentBookings: [],
        featuredProviders: []
      });
    }

    const customerOwnerFilter = isAuthCustomer
      ? {
          $or: [{ customerId: authUser._id }, { customerName: authUser.name }]
        }
      : requestedCustomerName
        ? { customerName: requestedCustomerName }
        : {};
    await expireTimedOutPendingBookings(customerOwnerFilter);

    const customerFilter = {
      ...customerOwnerFilter,
      hiddenForCustomer: { $ne: true }
    };

    const [services, featuredProviders, bookings] = await Promise.all([
      Service.find().sort({ providers: -1 }).lean(),
      getAvailableWorkers(6),
      Booking.find(customerFilter).sort({ createdAt: -1 }).lean()
    ]);

    const workerIds = [...new Set(bookings.map((booking) => booking.workerId).filter(Boolean).map((value) => String(value)))];
    const workerNames = [...new Set(bookings.map((booking) => booking.workerName).filter(Boolean))];
    const workerQuery = { role: "worker" };

    if (workerIds.length || workerNames.length) {
      workerQuery.$or = [];
      if (workerIds.length) {
        workerQuery.$or.push({ _id: { $in: workerIds } });
      }
      if (workerNames.length) {
        workerQuery.$or.push({ name: { $in: workerNames } });
      }
    }

    const workers = workerIds.length || workerNames.length ? await User.find(workerQuery).lean() : [];
    const workerById = new Map(workers.map((worker) => [String(worker._id), worker]));
    const workerByName = new Map(workers.map((worker) => [worker.name, worker]));

    const completed = bookings.filter((booking) => booking.status === "completed").length;
    const upcoming = bookings.filter((booking) => ["upcoming", "pending", "confirmed"].includes(booking.status)).length;
    const moneySaved = bookings.reduce((sum, booking) => {
      const explicitDiscount = Number(booking.discountAmount);
      if (Number.isFinite(explicitDiscount) && explicitDiscount >= 0) {
        return sum + explicitDiscount;
      }

      const originalAmount = Number(booking.originalAmount);
      if (Number.isFinite(originalAmount) && originalAmount > 0) {
        return sum + Math.round(originalAmount * 0.05);
      }

      const fallbackAmount = Number(booking.amount || 0);
      return sum + Math.round(fallbackAmount * 0.05);
    }, 0);
    const recentBookings = bookings.slice(0, 12).map((booking) => {
      const linkedWorker =
        (booking.workerId && workerById.get(String(booking.workerId))) || workerByName.get(booking.workerName) || null;
      const servicesProvided = Array.isArray(linkedWorker?.workerProfile?.servicesProvided)
        ? linkedWorker.workerProfile.servicesProvided
        : Array.isArray(booking.workerServices)
          ? booking.workerServices
          : [];

      return {
        ...booking,
        worker: {
          id: linkedWorker ? String(linkedWorker._id) : booking.workerId ? String(booking.workerId) : "",
          name: linkedWorker?.name || booking.workerName || "",
          email: linkedWorker?.email || booking.workerEmail || "",
          phone: linkedWorker?.workerProfile?.phone || booking.workerPhone || "",
          servicesProvided
        }
      };
    });

    return res.json({
      stats: {
        totalBookings: bookings.length,
        completed,
        upcoming,
        moneySaved
      },
      services,
      recentBookings,
      featuredProviders
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/bookings", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser.role !== "customer") {
      return res.status(403).json({ message: "Only customers can create bookings." });
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
      location: String(payload.location || "").trim() || "Dehradun",
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

    return res.status(201).json({ booking });
  } catch (error) {
    return next(error);
  }
});

router.patch("/customer/bookings/:bookingId/cancel", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser.role !== "customer") {
      return res.status(403).json({ message: "Only customers can cancel bookings." });
    }

    if (!isLikelyObjectId(req.params.bookingId)) {
      return res.status(400).json({ message: "Invalid booking id." });
    }

    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      $or: [{ customerId: req.authUser._id }, { customerName: req.authUser.name }],
      hiddenForCustomer: { $ne: true }
    });

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

    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

router.delete("/customer/bookings/:bookingId", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser.role !== "customer") {
      return res.status(403).json({ message: "Only customers can delete bookings." });
    }

    if (!isLikelyObjectId(req.params.bookingId)) {
      return res.status(400).json({ message: "Invalid booking id." });
    }

    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      $or: [{ customerId: req.authUser._id }, { customerName: req.authUser.name }]
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found for this customer." });
    }

    if (booking.hiddenForCustomer) {
      return res.json({ ok: true, booking });
    }

    booking.hiddenForCustomer = true;
    booking.hiddenForCustomerAt = new Date();
    await booking.save();
    return res.json({ ok: true, booking });
  } catch (error) {
    return next(error);
  }
});

router.patch("/customer/bookings/:bookingId/not-provided", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser.role !== "customer") {
      return res.status(403).json({ message: "Only customers can report service issues." });
    }

    if (!isLikelyObjectId(req.params.bookingId)) {
      return res.status(400).json({ message: "Invalid booking id." });
    }

    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      $or: [{ customerId: req.authUser._id }, { customerName: req.authUser.name }],
      hiddenForCustomer: { $ne: true }
    });

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

    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

router.patch("/customer/bookings/:bookingId/pay", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser.role !== "customer") {
      return res.status(403).json({ message: "Only customers can trigger payment." });
    }

    if (!isLikelyObjectId(req.params.bookingId)) {
      return res.status(400).json({ message: "Invalid booking id." });
    }

    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      $or: [{ customerId: req.authUser._id }, { customerName: req.authUser.name }],
      hiddenForCustomer: { $ne: true }
    });

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

    await ensureBookingBrokerAttribution(booking);
    booking.status = "completed";
    booking.brokerCommissionRate = BROKER_COMMISSION_RATE_PERCENT;
    booking.brokerCommissionAmount = calculateBrokerCommissionAmount({
      ...booking.toObject(),
      brokerCommissionAmount: undefined,
      brokerCommissionRate: BROKER_COMMISSION_RATE_PERCENT
    });
    await booking.save();

    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

router.patch("/customer/bookings/:bookingId/review", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser.role !== "customer") {
      return res.status(403).json({ message: "Only customers can submit reviews." });
    }

    if (!isLikelyObjectId(req.params.bookingId)) {
      return res.status(400).json({ message: "Invalid booking id." });
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

    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      $or: [{ customerId: req.authUser._id }, { customerName: req.authUser.name }],
      hiddenForCustomer: { $ne: true }
    });

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

    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
