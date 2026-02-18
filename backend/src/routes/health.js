import express from "express";
const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "backend",
    timestamp: new Date().toISOString()
  });
});

router.get("/config", (_req, res) => {
  res.json({
    apps: {
      landing: process.env.LANDING_APP_URL || "http://localhost:5173",
      customer: process.env.CUSTOMER_APP_URL || "http://localhost:5174",
      broker: process.env.BROKER_APP_URL || "http://localhost:5175",
      worker: process.env.WORKER_APP_URL || "http://localhost:5176"
    },
    apis: {
      main: process.env.MAIN_API_URL || "http://localhost:5000/api"
    }
  });
});

export default router;