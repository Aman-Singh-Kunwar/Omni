import express from "express";
import updatePasswordRoutes from "./updatePasswordRoutes.js";
import deleteAccountRoutes from "./deleteAccountRoutes.js";
import logoutRoutes from "./logoutRoutes.js";

const router = express.Router();

router.use(updatePasswordRoutes);
router.use(deleteAccountRoutes);
router.use(logoutRoutes);

export default router;
