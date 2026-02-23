import express from "express";
import authRoutes from "./auth/index.js";
import brokerRoutes from "./broker/index.js";
import catalogRoutes from "./catalog.js";
import customerRoutes from "./customer/index.js";
import healthRoutes from "./health.js";
import profileRoutes from "./profile/index.js";
import workerRoutes from "./worker/index.js";
const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(profileRoutes);
router.use(catalogRoutes);
router.use(customerRoutes);
router.use(brokerRoutes);
router.use(workerRoutes);

export default router;
