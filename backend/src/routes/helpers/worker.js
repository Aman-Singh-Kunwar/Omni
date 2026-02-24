import Booking from "../../models/Booking.js";
import User from "../../models/User.js";
import { toAvailableWorkerDto } from "../../schemas/profile.js";
import { normalizeForCompare } from "./common.js";

function buildWorkerBookingSummary(bookings) {
  const summaryMap = new Map();

  bookings.forEach((booking) => {
    const key = booking.workerName;
    if (!key) {
      return;
    }

    const current = summaryMap.get(key) || { completedJobs: 0, ratings: [] };
    if (booking.status === "completed") {
      current.completedJobs += 1;
      if (typeof booking.rating === "number") {
        current.ratings.push(booking.rating);
      }
    }

    summaryMap.set(key, current);
  });

  for (const [name, current] of summaryMap.entries()) {
    const averageRating = current.ratings.length
      ? Number((current.ratings.reduce((sum, value) => sum + value, 0) / current.ratings.length).toFixed(1))
      : 0;
    summaryMap.set(name, {
      completedJobs: current.completedJobs,
      averageRating
    });
  }

  return summaryMap;
}

async function getAvailableWorkers(limit = 0) {
  const query = User.find({
    role: "worker",
    $or: [{ "workerProfile.isAvailable": true }, { "workerProfile.isAvailable": { $exists: false } }]
  })
    .select({ name: 1, email: 1, workerProfile: 1, updatedAt: 1, createdAt: 1 })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  if (limit > 0) {
    query.limit(limit);
  }

  const workers = await query;
  if (!workers.length) {
    return [];
  }

  // Limit booking scan to the last 365 days — avoids a full-collection scan
  // while still capturing all practically relevant completed-job history.
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const workerNames = workers.map((worker) => worker.name);
  const bookings = await Booking.find({
    workerName: { $in: workerNames },
    createdAt: { $gte: oneYearAgo }
  })
    .select({ workerName: 1, status: 1, rating: 1 })
    .lean();

  const summaryByName = buildWorkerBookingSummary(bookings);
  return workers.map((worker) => toAvailableWorkerDto(worker, summaryByName.get(worker.name)));
}

function workerProvidesService(worker, service) {
  const target = normalizeForCompare(service);
  if (!target) {
    return false;
  }

  const provided = Array.isArray(worker.workerProfile?.servicesProvided) ? worker.workerProfile.servicesProvided : [];
  return provided.some((item) => normalizeForCompare(item) === target);
}

function bookingAssignedToWorker(booking, worker) {
  if (!booking || !worker) {
    return false;
  }

  const bookingWorkerId = booking.workerId ? String(booking.workerId) : "";
  const workerId = worker._id ? String(worker._id) : "";
  if (bookingWorkerId && workerId && bookingWorkerId === workerId) {
    return true;
  }

  const bookingWorkerName = normalizeForCompare(booking.workerName);
  const workerName = normalizeForCompare(worker.name);
  if (bookingWorkerName && workerName && bookingWorkerName === workerName) {
    return true;
  }

  const bookingWorkerEmail = normalizeForCompare(booking.workerEmail);
  const workerEmail = normalizeForCompare(worker.email);
  return Boolean(bookingWorkerEmail && workerEmail && bookingWorkerEmail === workerEmail);
}

function bookingHasAssignedWorker(booking) {
  return Boolean((booking?.workerId && String(booking.workerId)) || normalizeForCompare(booking?.workerName));
}

function bookingRejectedByWorker(booking, workerId) {
  const rejectedIds = Array.isArray(booking?.rejectedByWorkerIds) ? booking.rejectedByWorkerIds : [];
  const normalizedWorkerId = String(workerId || "");
  return rejectedIds.some((value) => String(value) === normalizedWorkerId);
}

function pendingBookingVisibleToWorker(booking, worker) {
  if (!booking || !worker || booking.status !== "pending") {
    return false;
  }
  if (bookingAssignedToWorker(booking, worker)) {
    return true;
  }
  if (bookingHasAssignedWorker(booking)) {
    return false;
  }
  if (bookingRejectedByWorker(booking, worker._id)) {
    return false;
  }
  return workerProvidesService(worker, booking.service);
}

export {
  bookingAssignedToWorker,
  bookingHasAssignedWorker,
  buildWorkerBookingSummary,
  getAvailableWorkers,
  pendingBookingVisibleToWorker,
  workerProvidesService
};
