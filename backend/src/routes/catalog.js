const express = require("express");

const Service = require("../models/Service");
const { getAvailableWorkers } = require("./helpers");

const router = express.Router();

router.get("/workers/available", async (_req, res, next) => {
  try {
    const workers = await getAvailableWorkers();
    return res.json({ workers });
  } catch (error) {
    return next(error);
  }
});

router.get("/services", async (_req, res, next) => {
  try {
    const services = await Service.find().sort({ rating: -1, providers: -1 }).lean();
    return res.json({ services });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
