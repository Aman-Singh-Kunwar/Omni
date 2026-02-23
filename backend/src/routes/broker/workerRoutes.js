import express from "express";
import Booking from "../../models/Booking.js";
import {
  buildWorkerBookingScope,
  calculateBrokerCommissionAmount,
  getBookingTotalAmount,
  getWorkersLinkedToBroker,
  normalizeForCompare,
  readAuthUserFromRequest
} from "../helpers.js";
import { buildBrokerAttributionScope } from "./shared.js";

const router = express.Router();

router.get("/broker/workers", async (req, res, next) => {
  try {
    res.set("Cache-Control", "private, max-age=20, stale-while-revalidate=40");
    const authUser = await readAuthUserFromRequest(req);
    if (!authUser || authUser.role !== "broker") {
      return res.json({ brokerCode: "", workers: [] });
    }

    const { brokerCode, workers, workerIds, workerNames, workerEmails } = await getWorkersLinkedToBroker(authUser);
    const workerScopeFilters = buildWorkerBookingScope(workerIds, workerNames, workerEmails);
    const brokerScopeFilters = buildBrokerAttributionScope(authUser, brokerCode);
    const bookings =
      workerScopeFilters.length && brokerScopeFilters.length
        ? await Booking.find({
            $and: [{ $or: brokerScopeFilters }, { $or: workerScopeFilters }]
          })
          .select({
            workerId: 1,
            workerName: 1,
            workerEmail: 1,
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
    const statsByWorkerEmail = new Map();
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
      statsByWorkerEmail.set(normalizeForCompare(worker.email), stats);
    });

    bookings.forEach((booking) => {
      let stats = booking.workerId ? statsByWorkerId.get(String(booking.workerId)) : null;
      if (!stats) {
        stats = statsByWorkerName.get(normalizeForCompare(booking.workerName));
      }
      if (!stats) {
        stats = statsByWorkerEmail.get(normalizeForCompare(booking.workerEmail));
      }
      if (!stats) {
        return;
      }

      stats.totalJobs += 1;
      if (booking.status === "completed") {
        stats.completedJobs += 1;
        stats.totalCompletedAmount += getBookingTotalAmount(booking);
        stats.totalBrokerCommission += calculateBrokerCommissionAmount(booking);
        if (typeof booking.rating === "number") {
          stats.ratings.push(booking.rating);
        }
      }
    });

    const workerItems = workers.map((worker) => {
      const stats =
        statsByWorkerId.get(String(worker._id)) ||
        statsByWorkerName.get(normalizeForCompare(worker.name)) ||
        statsByWorkerEmail.get(normalizeForCompare(worker.email)) || {
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

export default router;
