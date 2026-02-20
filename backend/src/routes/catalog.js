import express from "express";
import Service from "../models/Service.js";
import { getAvailableWorkers } from "./helpers.js";
const router = express.Router();

router.get("/workers/available", async (_req, res, next) => {
  try {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    const workers = await getAvailableWorkers();
    return res.json({ workers });
  } catch (error) {
    return next(error);
  }
});

router.get("/services", async (_req, res, next) => {
  try {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    const services = await Service.find().sort({ rating: -1, providers: -1 }).lean();
    return res.json({ services });
  } catch (error) {
    return next(error);
  }
});

export default router;
