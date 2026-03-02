import express from "express";
import AdvisorRequest from "../../models/AdvisorRequest.js";
import { requireAuth } from "../helpers.js";

const router = express.Router();

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

router.post("/customer/advisor-requests", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser?.role !== "customer") {
      return res.status(403).json({ message: "Only customers can request advisor callbacks." });
    }

    const payload = req.body || {};
    const fullName = String(payload.fullName || "").trim();
    const phoneNumberRaw = String(payload.phoneNumber || "").trim();
    const phoneDigits = normalizePhoneDigits(phoneNumberRaw);
    const category = String(payload.category || "").trim();
    const selectedPlan = String(payload.selectedPlan || "").trim();
    const preferredTime = String(payload.preferredTime || "").trim();
    const message = String(payload.message || "").trim();

    if (!fullName) {
      return res.status(400).json({ message: "Full name is required." });
    }
    if (phoneDigits.length !== 10) {
      return res.status(400).json({ message: "Please enter a valid 10-digit phone number." });
    }
    if (!category) {
      return res.status(400).json({ message: "Category is required." });
    }
    if (!preferredTime) {
      return res.status(400).json({ message: "Preferred time is required." });
    }

    const request = await AdvisorRequest.create({
      customerId: req.authUser._id,
      fullName,
      phoneNumber: phoneDigits,
      category,
      selectedPlan,
      preferredTime,
      message
    });

    return res.status(201).json({
      message: "Advisor callback request submitted successfully.",
      advisorRequestId: String(request._id || "")
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
