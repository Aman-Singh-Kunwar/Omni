import express from "express";
import dashboardRoutes from "./dashboardRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import bookingRoutes from "./bookingRoutes.js";

const router = express.Router();

router.use(dashboardRoutes);
router.use(reviewRoutes);
router.use(bookingRoutes);

export default router;
