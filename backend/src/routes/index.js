const express = require("express");

const authRoutes = require("./auth");
const brokerRoutes = require("./broker");
const catalogRoutes = require("./catalog");
const customerRoutes = require("./customer");
const healthRoutes = require("./health");
const profileRoutes = require("./profile");
const workerRoutes = require("./worker");

const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(profileRoutes);
router.use(catalogRoutes);
router.use(customerRoutes);
router.use(brokerRoutes);
router.use(workerRoutes);

module.exports = router;
