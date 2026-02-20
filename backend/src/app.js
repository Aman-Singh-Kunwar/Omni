import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import logger from "./utils/logger.js";

const app = express();
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

function getPublicConfig() {
  const apiBase = normalizeBaseUrl(process.env.MAIN_API_URL, DEFAULT_URLS.api);
  const backendBase = apiBase.replace(/\/api$/, "");

  return {
    environment: process.env.NODE_ENV || "development",
    apps: {
      landing: normalizeBaseUrl(process.env.LANDING_APP_URL, DEFAULT_URLS.landing),
      customer: normalizeBaseUrl(process.env.CUSTOMER_APP_URL, DEFAULT_URLS.customer),
      broker: normalizeBaseUrl(process.env.BROKER_APP_URL, DEFAULT_URLS.broker),
      worker: normalizeBaseUrl(process.env.WORKER_APP_URL, DEFAULT_URLS.worker)
    },
    api: {
      backendBase,
      main: apiBase,
      health: `${apiBase}/health`,
      config: `${apiBase}/config`
    }
  };
}

function isDatabaseConnectivityError(error) {
  const name = String(error?.name || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  if (name.includes("mongoserverselectionerror") || name.includes("mongooseerror")) {
    return true;
  }

  const patterns = [
    "enotfound",
    "eai_again",
    "etimedout",
    "econnrefused",
    "server selection timed out",
    "getaddrinfo",
    "querysrv",
    "mongodb.net"
  ];

  return patterns.some((pattern) => message.includes(pattern));
}

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  const method = req.method || "UNKNOWN";

  res.json = (payload) => {
    if (payload && typeof payload === "object" && typeof payload.message === "string" && payload.message.trim()) {
      const path = req.originalUrl || req.url;
      const statusCode = res.statusCode || 200;
      const meta = {
        path,
        statusCode,
        message: payload.message
      };
      const onceKey = `frontend_notice:${path}:${statusCode}:${payload.message}`;

      if (statusCode >= 500) {
        logger.errorOnce(onceKey, "Notification sent to frontend", meta);
      } else if (statusCode >= 400) {
        logger.warnOnce(onceKey, "Notification sent to frontend", meta);
      } else {
        logger.infoOnce(onceKey, "Notification sent to frontend", meta);
      }

      if (statusCode >= 500) {
        logger.errorOnce(`api_error:${method}:${path}:${statusCode}:${payload.message}`, "API request failed", {
          method,
          path,
          statusCode,
          message: payload.message
        });
      } else if (statusCode >= 400) {
        logger.warnOnce(`api_warn:${method}:${path}:${statusCode}:${payload.message}`, "API request warning", {
          method,
          path,
          statusCode,
          message: payload.message
        });
      }
    }

    return originalJson(payload);
  };

  next();
});

app.get("/", (_req, res) => {
  res.set("Cache-Control", "no-store");
  const info = getPublicConfig();
  res.json({
    message: "Omni Backend is running",
    ok: true,
    timestamp: new Date().toISOString(),
    environment: info.environment,
    urls: {
      backend: info.api.backendBase,
      api: info.api.main,
      health: info.api.health,
      config: info.api.config
    },
    apps: info.apps,
    note: "Use /api/health and /api/config for programmatic checks."
  });
});

app.get("/api", (_req, res) => {
  res.set("Cache-Control", "no-store");
  const info = getPublicConfig();
  res.json({
    message: "Omni API root",
    ok: true,
    timestamp: new Date().toISOString(),
    api: info.api,
    apps: info.apps,
    endpoints: {
      health: "/api/health",
      config: "/api/config",
      authLogin: "/api/auth/login",
      profile: "/api/profile",
      customerDashboard: "/api/customer/dashboard",
      brokerDashboard: "/api/broker/dashboard",
      workerDashboard: "/api/worker/dashboard"
    }
  });
});

app.use("/api", routes);

app.use((err, req, res, _next) => {
  const isDbConnectivityIssue = isDatabaseConnectivityError(err);
  const statusCode = isDbConnectivityIssue ? 503 : err?.statusCode || 500;
  logger.errorOnce(`route_error:${statusCode}:${req.method}:${req.originalUrl || req.url}:${err?.message || "unknown"}`, "Unhandled route error", {
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode,
    message: err?.message || "Unknown error",
    stack: err?.stack
  });

  res.status(statusCode).json({
    message: isDbConnectivityIssue ? "Database temporarily unreachable. Please try again." : err?.message || "Internal server error"
  });
});

export default app;
