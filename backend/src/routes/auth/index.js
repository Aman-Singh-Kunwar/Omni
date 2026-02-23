import express from "express";
import publicRoutes from "./public/index.js";
import roleRoutes from "./roleRoutes.js";
import accountRoutes from "./accountRoutes.js";

const router = express.Router();

router.use(publicRoutes);
router.use(roleRoutes);
router.use(accountRoutes);

export default router;
