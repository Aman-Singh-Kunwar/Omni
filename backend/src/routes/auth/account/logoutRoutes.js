import express from "express";
import { logger, requireAuth } from "../shared.js";

const router = express.Router();

router.post("/auth/logout", requireAuth, async (req, res, next) => {
  try {
    logger.info("Logout successful", {
      userId: String(req.authUser._id),
      email: req.authUser.email,
      role: req.authUser.role
    });
    return res.json({ message: "Logged out successfully." });
  } catch (error) {
    logger.error("Login failed with exception", {
      email: String(req.body?.email || "").trim().toLowerCase(),
      role: String(req.body?.role || "").trim(),
      message: error?.message || "Unknown login error"
    });
    return next(error);
  }
});

export default router;
