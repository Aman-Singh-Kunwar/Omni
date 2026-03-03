import express from "express";
import Booking from "../../models/Booking.js";
import User from "../../models/User.js";
import { resolvePhotoUrlFromUser } from "../../schemas/profile.js";
import { isLikelyObjectId, readAuthUserFromRequest, safeNormalizeBrokerCode } from "../helpers.js";

const router = express.Router();

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toStarCountMap() {
  return {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0
  };
}

router.get("/worker/public-profile", async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    const authUser = await readAuthUserFromRequest(req);
    const workerId = String(req.query.workerId || "").trim();
    const workerName = String(req.query.workerName || "").trim();
    const workerEmail = String(req.query.workerEmail || "")
      .trim()
      .toLowerCase();

    const workerFilters = [];
    if (workerId && isLikelyObjectId(workerId)) {
      workerFilters.push({ _id: workerId });
    }
    if (workerName) {
      workerFilters.push({ name: new RegExp(`^${escapeRegex(workerName)}$`, "i") });
    }
    if (workerEmail) {
      workerFilters.push({ email: workerEmail });
    }

    if (!workerFilters.length) {
      return res.status(400).json({ message: "workerId or workerName is required." });
    }

    const worker = await User.findOne({
      role: "worker",
      $or: workerFilters
    }).lean();

    if (!worker) {
      return res.status(404).json({ message: "Worker not found." });
    }

    const bookings = await Booking.find({
      $or: [{ workerId: worker._id }, { workerName: worker.name }, { workerEmail: worker.email }]
    })
      .select({ chatMessages: 0 })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const workerBookings = bookings.filter((booking) => String(booking.status || "").toLowerCase() !== "pending");
    const completedJobs = workerBookings.filter((booking) => String(booking.status || "").toLowerCase() === "completed");
    const ratedJobs = workerBookings.filter((booking) => typeof booking.rating === "number" && booking.rating > 0);
    const averageRating = ratedJobs.length
      ? Number((ratedJobs.reduce((sum, booking) => sum + booking.rating, 0) / ratedJobs.length).toFixed(1))
      : 0;
    const ratingBreakdown = ratedJobs.reduce((acc, booking) => {
      const star = Number(booking.rating);
      if (star >= 1 && star <= 5) {
        acc[star] += 1;
      }
      return acc;
    }, toStarCountMap());

    const servicesProvided = Array.isArray(worker.workerProfile?.servicesProvided)
      ? worker.workerProfile.servicesProvided
      : [];
    const workerBrokerId = worker.workerProfile?.brokerId ? String(worker.workerProfile.brokerId) : "";
    const workerBrokerCode = safeNormalizeBrokerCode(worker.workerProfile?.brokerCode);
    const viewerBrokerId = authUser?._id ? String(authUser._id) : "";
    const viewerBrokerCode = safeNormalizeBrokerCode(authUser?.brokerProfile?.brokerCode);
    const isBrokerViewer = authUser?.role === "broker";
    const isViewerLinkedBroker =
      isBrokerViewer &&
      ((viewerBrokerId && workerBrokerId && viewerBrokerId === workerBrokerId) ||
        (viewerBrokerCode && workerBrokerCode && viewerBrokerCode === workerBrokerCode));

    const brokerCommissionEarnings = isViewerLinkedBroker
      ? completedJobs.reduce((sum, booking) => {
          const bookingBrokerId = booking?.brokerId ? String(booking.brokerId) : "";
          const bookingBrokerCode = safeNormalizeBrokerCode(booking?.brokerCode);
          const belongsToViewerBroker =
            (viewerBrokerId && bookingBrokerId && bookingBrokerId === viewerBrokerId) ||
            (viewerBrokerCode && bookingBrokerCode && bookingBrokerCode === viewerBrokerCode);
          if (!belongsToViewerBroker) {
            return sum;
          }
          return sum + Number(booking?.brokerCommissionAmount || 0);
        }, 0)
      : 0;

    const broker =
      worker.workerProfile?.brokerId && isLikelyObjectId(worker.workerProfile.brokerId)
        ? await User.findOne({ _id: worker.workerProfile.brokerId, role: "broker" }).select({ name: 1 }).lean()
        : null;

    const reviews = ratedJobs.slice(0, 40).map((booking) => ({
      id: String(booking._id),
      customerName: booking.customerName || "Customer",
      service: booking.service || "Service",
      rating: Number(booking.rating || 0),
      feedback: String(booking.feedback || "").trim(),
      feedbackMedia: Array.isArray(booking.feedbackMedia)
        ? booking.feedbackMedia
            .map((media) => ({
              kind: media?.kind === "video" ? "video" : "image",
              mimeType: String(media?.mimeType || ""),
              dataUrl: String(media?.dataUrl || "")
            }))
            .filter((media) => media.dataUrl)
        : [],
      amount: Number(booking.amount || 0),
      date: booking.date || "",
      time: booking.time || "",
      status: booking.status || "completed",
      createdAt: booking.createdAt
    }));

    return res.json({
      worker: {
        id: String(worker._id),
        name: worker.name || "Worker",
        email: worker.email || "",
        emailVerified: worker.emailVerified !== false,
        phone: worker.workerProfile?.phone || "",
        bio: worker.workerProfile?.bio || "",
        gender: worker.workerProfile?.gender || "",
        isAvailable: worker.workerProfile?.isAvailable !== false,
        servicesProvided,
        brokerName: broker?.name || "",
        photoUrl: resolvePhotoUrlFromUser(worker, "workerProfile"),
        joinedAt: worker.createdAt || null,
        averageRating,
        reviewCount: ratedJobs.length,
        totalJobs: workerBookings.length,
        completedJobs: completedJobs.length,
        brokerCommissionEarnings
      },
      ratingBreakdown,
      reviews
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
