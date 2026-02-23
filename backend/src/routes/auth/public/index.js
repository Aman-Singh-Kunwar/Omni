import express from "express";
import signupRoutes from "./signupRoutes.js";
import passwordRoutes from "./passwordRoutes.js";
import sessionRoutes from "./sessionRoutes.js";

const router = express.Router();

router.use(signupRoutes);
router.use(passwordRoutes);
router.use(sessionRoutes);

export default router;
