import express from "express";
import dashboardRoutes from "./dashboardRoutes.js";
import bookingRoutes from "./bookingRoutes.js";

const router = express.Router();

router.use(dashboardRoutes);
router.use(bookingRoutes);

export default router;
