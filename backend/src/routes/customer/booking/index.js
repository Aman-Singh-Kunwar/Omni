import express from "express";
import createRoutes from "./createRoutes.js";
import lifecycleRoutes from "./lifecycleRoutes.js";
import settlementRoutes from "./settlementRoutes.js";

const router = express.Router();

router.use(createRoutes);
router.use(lifecycleRoutes);
router.use(settlementRoutes);

export default router;
