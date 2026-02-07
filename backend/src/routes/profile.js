const express = require("express");

const User = require("../models/User");
const { PROFILE_PATH_BY_ROLE, buildProfileUpdate, toProfileDto } = require("../schemas/profile");
const { findBrokerByCode, requireAuth, safeNormalizeBrokerCode, toAuthUser } = require("./helpers");

const router = express.Router();

router.get("/profile", requireAuth, async (req, res, next) => {
  try {
    return res.json(toProfileDto(req.authUser));
  } catch (error) {
    return next(error);
  }
});

router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

    if (name) {
      req.authUser.name = name;
    }

    if (email && email !== req.authUser.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      const existing = await User.findOne({ email, role: req.authUser.role }).select({ _id: 1 }).lean();
      if (existing && String(existing._id) !== String(req.authUser._id)) {
        return res.status(409).json({ message: "Email already registered for this role." });
      }

      req.authUser.email = email;
    }

    const roleProfilePath = PROFILE_PATH_BY_ROLE[req.authUser.role];
    if (!roleProfilePath) {
      return res.status(400).json({ message: "Unsupported role profile." });
    }

    const updates = buildProfileUpdate(req.authUser.role, payload);

    if (req.authUser.role === "worker") {
      const requestedBrokerCode = safeNormalizeBrokerCode(updates.brokerCode);
      if (requestedBrokerCode) {
        const linkedBroker = await findBrokerByCode(requestedBrokerCode);
        if (!linkedBroker) {
          return res.status(404).json({ message: "Broker not found for the provided broker code." });
        }
        updates.brokerCode = linkedBroker.code;
        updates.brokerId = linkedBroker.id;
      } else {
        updates.brokerCode = "";
        updates.brokerId = undefined;
      }
    }

    if (!req.authUser[roleProfilePath]) {
      req.authUser[roleProfilePath] = {};
    }

    Object.entries(updates).forEach(([key, value]) => {
      req.authUser[roleProfilePath][key] = value;
    });

    await req.authUser.save();

    return res.json({
      ...toProfileDto(req.authUser),
      user: toAuthUser(req.authUser)
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
});

module.exports = router;
