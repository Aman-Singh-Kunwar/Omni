import express from "express";
const router = express.Router();
const isProductionEnv = String(process.env.NODE_ENV || "").toLowerCase() === "production";

const DEFAULT_URLS = {
  landing: isProductionEnv ? "https://omni-landing-page.onrender.com" : "http://localhost:5173",
  customer: isProductionEnv ? "https://omni-customer.onrender.com" : "http://localhost:5174",
  broker: isProductionEnv ? "https://omni-broker.onrender.com" : "http://localhost:5175",
  worker: isProductionEnv ? "https://omni-worker.onrender.com" : "http://localhost:5176",
  api: isProductionEnv ? "https://omni-backend-4t7s.onrender.com/api" : "http://localhost:5000/api"
};

function normalizeBaseUrl(value, fallback) {
  const normalized = String(value || fallback || "").trim().replace(/\/+$/, "");
  return normalized || String(fallback || "").trim();
}

router.get("/health", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    service: "backend",
    timestamp: new Date().toISOString()
  });
});

router.get("/config", (_req, res) => {
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json({
    apps: {
      landing: normalizeBaseUrl(process.env.LANDING_APP_URL, DEFAULT_URLS.landing),
      customer: normalizeBaseUrl(process.env.CUSTOMER_APP_URL, DEFAULT_URLS.customer),
      broker: normalizeBaseUrl(process.env.BROKER_APP_URL, DEFAULT_URLS.broker),
      worker: normalizeBaseUrl(process.env.WORKER_APP_URL, DEFAULT_URLS.worker)
    },
    apis: {
      main: normalizeBaseUrl(process.env.MAIN_API_URL, DEFAULT_URLS.api)
    }
  });
});

export default router;
