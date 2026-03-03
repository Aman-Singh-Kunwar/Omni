import express from "express";
import emailChangeRoutes from "./emailChangeRoutes.js";
import readRoutes from "./readRoutes.js";
import updateRoutes from "./updateRoutes.js";
import notificationRoutes from "./notificationRoutes.js";

const router = express.Router();

router.use(readRoutes);
router.use(updateRoutes);
router.use(emailChangeRoutes);
router.use(notificationRoutes);

export default router;
