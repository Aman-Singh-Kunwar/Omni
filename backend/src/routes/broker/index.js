import express from "express";
import dashboardRoutes from "./dashboardRoutes.js";
import workerRoutes from "./workerRoutes.js";
import bookingRoutes from "./bookingRoutes.js";

const router = express.Router();

router.use(dashboardRoutes);
router.use(workerRoutes);
router.use(bookingRoutes);

export default router;
