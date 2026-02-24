import express from "express";
import Booking from "../../models/Booking.js";
import Service from "../../models/Service.js";
import User from "../../models/User.js";
import { expireTimedOutPendingBookings, getAvailableWorkers, readAuthUserFromRequest } from "../helpers.js";

const router = express.Router();

router.get("/customer/dashboard", async (req, res, next) => {
  try {
    res.set("Cache-Control", "private, max-age=20, stale-while-revalidate=40");
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
      Booking.find(customerFilter).select({ chatMessages: 0 }).sort({ createdAt: -1 }).lean()
    ]);

    const workerIds = [...new Set(bookings.map((booking) => booking.workerId).filter(Boolean).map((value) => String(value)))];
    const workerNames = [...new Set(bookings.map((booking) => booking.workerName).filter(Boolean))];
    const workerEmails = [
      ...new Set(
        bookings
          .map((booking) => String(booking.workerEmail || "").trim().toLowerCase())
          .filter(Boolean)
      )
    ];
    const workerQuery = { role: "worker" };

    if (workerIds.length || workerNames.length || workerEmails.length) {
      workerQuery.$or = [];
      if (workerIds.length) {
        workerQuery.$or.push({ _id: { $in: workerIds } });
      }
      if (workerNames.length) {
        workerQuery.$or.push({ name: { $in: workerNames } });
      }
      if (workerEmails.length) {
        workerQuery.$or.push({ email: { $in: workerEmails } });
      }
    }

    const workers = workerIds.length || workerNames.length || workerEmails.length ? await User.find(workerQuery).lean() : [];
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

export default router;
