import express from "express";
import dashboardRoutes from "./dashboardRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import bookingRoutes from "./bookingRoutes.js";
import publicProfileRoutes from "./publicProfileRoutes.js";

const router = express.Router();

router.use(dashboardRoutes);
router.use(reviewRoutes);
router.use(bookingRoutes);
router.use(publicProfileRoutes);

export default router;
