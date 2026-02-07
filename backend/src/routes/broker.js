const express = require("express");

const Booking = require("../models/Booking");
const {
  ACTIVE_BOOKING_STATUSES,
  bookingBelongsToWorkerScope,
  buildWorkerBookingScope,
  buildWorkerBookingSummary,
  calculateBrokerCommissionAmount,
  expireTimedOutPendingBookings,
  getBookingTotalAmount,
  getWorkersLinkedToBroker,
  normalizeForCompare,
  readAuthUserFromRequest
} = require("./helpers");

const router = express.Router();

router.get("/broker/dashboard", async (req, res, next) => {
  try {
    const authUser = await readAuthUserFromRequest(req);
    if (!authUser || authUser.role !== "broker") {
      return res.json({
        stats: {
          totalWorkers: 0,
          totalEarnings: 0,
          activeBookings: 0,
          monthlyGrowth: 0
        },
        recentBookings: [],
        topWorkers: []
      });
    }

    const { brokerCode, workers, workerIds, workerNames } = await getWorkersLinkedToBroker(authUser);
    const bookingScopeFilters = buildWorkerBookingScope(workerIds, workerNames);
    if (brokerCode) {
      bookingScopeFilters.push({ brokerCode });
    }
    bookingScopeFilters.push({ brokerId: authUser._id });

    await expireTimedOutPendingBookings({ $or: bookingScopeFilters });

    const bookings = await Booking.find({ $or: bookingScopeFilters }).sort({ createdAt: -1 }).lean();
    const workerIdSet = new Set(workerIds.map((value) => String(value)));
    const workerNameSet = new Set(workerNames.map((value) => normalizeForCompare(value)));
    const completedBookings = bookings.filter((booking) => booking.status === "completed");
    const totalCommission = completedBookings.reduce(
      (sum, booking) =>
        sum +
        calculateBrokerCommissionAmount(booking, {
          forceCommission: bookingBelongsToWorkerScope(booking, workerIdSet, workerNameSet)
        }),
      0
    );
    const activeBookings = bookings.filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status)).length;

    const recentBookings = bookings.slice(0, 6).map((booking) => ({
      id: booking._id,
      customer: booking.customerName,
      service: booking.service,
      worker: booking.workerName,
      commission:
        booking.status === "completed"
          ? calculateBrokerCommissionAmount(booking, {
              forceCommission: bookingBelongsToWorkerScope(booking, workerIdSet, workerNameSet)
            })
          : 0,
      status: booking.status
    }));

    const commissionByWorkerId = new Map();
    const commissionByWorkerName = new Map();
    completedBookings.forEach((booking) => {
      const commission = calculateBrokerCommissionAmount(booking, { forceCommission: true });
      if (!commission) {
        return;
      }

      const workerId = booking.workerId ? String(booking.workerId) : "";
      if (workerId && workerIdSet.has(workerId)) {
        commissionByWorkerId.set(workerId, (commissionByWorkerId.get(workerId) || 0) + commission);
      }

      const workerName = normalizeForCompare(booking.workerName);
      if (workerName && workerNameSet.has(workerName)) {
        commissionByWorkerName.set(workerName, (commissionByWorkerName.get(workerName) || 0) + commission);
      }
    });

    const workerBookingsSummary = buildWorkerBookingSummary(bookings);
    const topWorkers = workers
      .map((worker) => {
        const summary = workerBookingsSummary.get(worker.name) || { completedJobs: 0, averageRating: 0 };
        const servicesProvided = worker.workerProfile?.servicesProvided || [];
        const workerId = String(worker._id);
        const workerName = normalizeForCompare(worker.name);
        const brokerCommission = Math.round(
          commissionByWorkerId.get(workerId) || commissionByWorkerName.get(workerName) || 0
        );
        return {
          id: worker._id,
          name: worker.name,
          service: servicesProvided[0] || "General Service",
          rating: summary.averageRating,
          jobs: summary.completedJobs,
          brokerCommission
        };
      })
      .sort((a, b) => b.brokerCommission - a.brokerCommission || b.rating - a.rating || b.jobs - a.jobs)
      .slice(0, 6);

    return res.json({
      stats: {
        totalWorkers: workers.length,
        totalEarnings: totalCommission,
        activeBookings,
        monthlyGrowth: 0
      },
      brokerCode,
      recentBookings,
      topWorkers
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/broker/workers", async (req, res, next) => {
  try {
    const authUser = await readAuthUserFromRequest(req);
    if (!authUser || authUser.role !== "broker") {
      return res.json({ brokerCode: "", workers: [] });
    }

    const { brokerCode, workers, workerIds, workerNames } = await getWorkersLinkedToBroker(authUser);
    const bookingScopeFilters = buildWorkerBookingScope(workerIds, workerNames);
    const bookings = bookingScopeFilters.length
      ? await Booking.find({ $or: bookingScopeFilters })
          .select({
            workerId: 1,
            workerName: 1,
            status: 1,
            amount: 1,
            originalAmount: 1,
            discountAmount: 1,
            discountPercent: 1,
            brokerCommissionAmount: 1,
            brokerCommissionRate: 1,
            rating: 1
          })
          .lean()
      : [];

    const statsByWorkerId = new Map();
    const statsByWorkerName = new Map();
    workers.forEach((worker) => {
      const stats = {
        totalJobs: 0,
        completedJobs: 0,
        totalCompletedAmount: 0,
        totalBrokerCommission: 0,
        ratings: []
      };
      statsByWorkerId.set(String(worker._id), stats);
      statsByWorkerName.set(normalizeForCompare(worker.name), stats);
    });

    bookings.forEach((booking) => {
      let stats = booking.workerId ? statsByWorkerId.get(String(booking.workerId)) : null;
      if (!stats) {
        stats = statsByWorkerName.get(normalizeForCompare(booking.workerName));
      }
      if (!stats) {
        return;
      }

      stats.totalJobs += 1;
      if (booking.status === "completed") {
        stats.completedJobs += 1;
        stats.totalCompletedAmount += getBookingTotalAmount(booking);
        stats.totalBrokerCommission += calculateBrokerCommissionAmount(booking, { forceCommission: true });
        if (typeof booking.rating === "number") {
          stats.ratings.push(booking.rating);
        }
      }
    });

    const workerItems = workers.map((worker) => {
      const stats =
        statsByWorkerId.get(String(worker._id)) || statsByWorkerName.get(normalizeForCompare(worker.name)) || {
          totalJobs: 0,
          completedJobs: 0,
          totalCompletedAmount: 0,
          totalBrokerCommission: 0,
          ratings: []
        };
      const averageRating = stats.ratings.length
        ? Number((stats.ratings.reduce((sum, value) => sum + value, 0) / stats.ratings.length).toFixed(1))
        : 0;

      return {
        id: String(worker._id),
        name: worker.name || "Worker",
        email: worker.email || "",
        phone: worker.workerProfile?.phone || "",
        servicesProvided: Array.isArray(worker.workerProfile?.servicesProvided) ? worker.workerProfile.servicesProvided : [],
        isAvailable: worker.workerProfile?.isAvailable !== false,
        totalJobs: stats.totalJobs,
        completedJobs: stats.completedJobs,
        averageRating,
        totalCompletedAmount: Math.round(stats.totalCompletedAmount),
        totalBrokerCommission: Math.round(stats.totalBrokerCommission)
      };
    });

    return res.json({
      brokerCode,
      workers: workerItems
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/broker/bookings", async (req, res, next) => {
  try {
    const authUser = await readAuthUserFromRequest(req);
    if (!authUser || authUser.role !== "broker") {
      return res.json({ brokerCode: "", bookings: [] });
    }

    const { brokerCode, workerIds, workerNames } = await getWorkersLinkedToBroker(authUser);
    const bookingScopeFilters = buildWorkerBookingScope(workerIds, workerNames);
    if (!bookingScopeFilters.length) {
      return res.json({ brokerCode, bookings: [] });
    }

    const completedBookings = await Booking.find({
      status: "completed",
      $or: bookingScopeFilters
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const bookings = completedBookings.map((booking) => ({
      id: String(booking._id),
      customerName: booking.customerName || "Customer",
      workerName: booking.workerName || "Worker",
      service: booking.service || "Service",
      date: booking.date || "",
      time: booking.time || "",
      amount: getBookingTotalAmount(booking),
      brokerCommission: calculateBrokerCommissionAmount(booking, { forceCommission: true }),
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

module.exports = router;
