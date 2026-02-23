import express from "express";
import Booking from "../../models/Booking.js";
import {
  ACTIVE_BOOKING_STATUSES,
  buildWorkerBookingScope,
  calculateBrokerCommissionAmount,
  expireTimedOutPendingBookings,
  getWorkersLinkedToBroker,
  normalizeForCompare,
  readAuthUserFromRequest
} from "../helpers.js";
import { buildBrokerAttributionScope } from "./shared.js";

const router = express.Router();

router.get("/broker/dashboard", async (req, res, next) => {
  try {
    res.set("Cache-Control", "private, max-age=20, stale-while-revalidate=40");
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

    const { brokerCode, workers, workerIds, workerNames, workerEmails } = await getWorkersLinkedToBroker(authUser);
    const workerScopeFilters = buildWorkerBookingScope(workerIds, workerNames, workerEmails);
    const brokerScopeFilters = buildBrokerAttributionScope(authUser, brokerCode);
    const bookingsQuery = workerScopeFilters.length
      ? {
          $and: [{ $or: brokerScopeFilters }, { $or: workerScopeFilters }]
        }
      : {
          $or: brokerScopeFilters
        };

    await expireTimedOutPendingBookings(bookingsQuery);

    const bookings = await Booking.find(bookingsQuery).sort({ createdAt: -1 }).lean();
    const workerIdSet = new Set(workerIds.map((value) => String(value)));
    const workerNameSet = new Set(workerNames.map((value) => normalizeForCompare(value)));
    const workerEmailSet = new Set(workerEmails.map((value) => normalizeForCompare(value)));
    const completedBookings = bookings.filter((booking) => booking.status === "completed");
    const totalCommission = completedBookings.reduce((sum, booking) => sum + calculateBrokerCommissionAmount(booking), 0);
    const activeBookings = bookings.filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status)).length;

    const recentBookings = bookings.slice(0, 6).map((booking) => ({
      id: booking._id,
      customer: booking.customerName,
      service: booking.service,
      worker: booking.workerName,
      commission: booking.status === "completed" ? calculateBrokerCommissionAmount(booking) : 0,
      status: booking.status
    }));

    const commissionByWorkerId = new Map();
    const commissionByWorkerName = new Map();
    const commissionByWorkerEmail = new Map();
    completedBookings.forEach((booking) => {
      const commission = calculateBrokerCommissionAmount(booking);
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

      const workerEmail = normalizeForCompare(booking.workerEmail);
      if (workerEmail && workerEmailSet.has(workerEmail)) {
        commissionByWorkerEmail.set(workerEmail, (commissionByWorkerEmail.get(workerEmail) || 0) + commission);
      }
    });

    const completedJobsByWorkerId = new Map();
    const completedJobsByWorkerName = new Map();
    const completedJobsByWorkerEmail = new Map();
    const ratingsByWorkerId = new Map();
    const ratingsByWorkerName = new Map();
    const ratingsByWorkerEmail = new Map();
    completedBookings.forEach((booking) => {
      const workerId = booking.workerId ? String(booking.workerId) : "";
      const workerName = normalizeForCompare(booking.workerName);
      const workerEmail = normalizeForCompare(booking.workerEmail);

      if (workerId && workerIdSet.has(workerId)) {
        completedJobsByWorkerId.set(workerId, (completedJobsByWorkerId.get(workerId) || 0) + 1);
        if (typeof booking.rating === "number") {
          ratingsByWorkerId.set(workerId, [...(ratingsByWorkerId.get(workerId) || []), booking.rating]);
        }
      }
      if (workerName && workerNameSet.has(workerName)) {
        completedJobsByWorkerName.set(workerName, (completedJobsByWorkerName.get(workerName) || 0) + 1);
        if (typeof booking.rating === "number") {
          ratingsByWorkerName.set(workerName, [...(ratingsByWorkerName.get(workerName) || []), booking.rating]);
        }
      }
      if (workerEmail && workerEmailSet.has(workerEmail)) {
        completedJobsByWorkerEmail.set(workerEmail, (completedJobsByWorkerEmail.get(workerEmail) || 0) + 1);
        if (typeof booking.rating === "number") {
          ratingsByWorkerEmail.set(workerEmail, [...(ratingsByWorkerEmail.get(workerEmail) || []), booking.rating]);
        }
      }
    });

    const topWorkers = workers
      .map((worker) => {
        const servicesProvided = worker.workerProfile?.servicesProvided || [];
        const workerId = String(worker._id);
        const workerName = normalizeForCompare(worker.name);
        const workerEmail = normalizeForCompare(worker.email);
        const completedJobs =
          completedJobsByWorkerId.get(workerId) ||
          completedJobsByWorkerName.get(workerName) ||
          completedJobsByWorkerEmail.get(workerEmail) ||
          0;
        const ratingValues =
          ratingsByWorkerId.get(workerId) || ratingsByWorkerName.get(workerName) || ratingsByWorkerEmail.get(workerEmail) || [];
        const averageRating = ratingValues.length
          ? Number((ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length).toFixed(1))
          : 0;
        const brokerCommission = Math.round(
          commissionByWorkerId.get(workerId) || commissionByWorkerName.get(workerName) || commissionByWorkerEmail.get(workerEmail) || 0
        );
        return {
          id: worker._id,
          name: worker.name,
          service: servicesProvided[0] || "General Service",
          rating: averageRating,
          jobs: completedJobs,
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

export default router;
