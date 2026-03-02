import express from "express";
import dashboardRoutes from "./dashboardRoutes.js";
import bookingRoutes from "./bookingRoutes.js";
import advisorRoutes from "./advisorRoutes.js";

const router = express.Router();

router.use(dashboardRoutes);
router.use(bookingRoutes);
router.use(advisorRoutes);

export default router;
