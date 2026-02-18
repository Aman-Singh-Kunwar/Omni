import express from "express";
import authRoutes from "./auth.js";
import brokerRoutes from "./broker.js";
import catalogRoutes from "./catalog.js";
import customerRoutes from "./customer.js";
import healthRoutes from "./health.js";
import profileRoutes from "./profile.js";
import workerRoutes from "./worker.js";
const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(profileRoutes);
router.use(catalogRoutes);
router.use(customerRoutes);
router.use(brokerRoutes);
router.use(workerRoutes);

export default router;