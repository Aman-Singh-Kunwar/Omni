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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildUiHtml({ info, requestedPath }) {
  const safePath = escapeHtml(requestedPath);
  const environment = escapeHtml(info.environment);
  const backendUrl = escapeHtml(info.api.backendBase);
  const apiUrl = escapeHtml(info.api.main);
  const healthUrl = escapeHtml(info.api.health);
  const configUrl = escapeHtml(info.api.config);
  const landingUrl = escapeHtml(info.apps.landing);
  const customerUrl = escapeHtml(info.apps.customer);
  const brokerUrl = escapeHtml(info.apps.broker);
  const workerUrl = escapeHtml(info.apps.worker);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Omni Backend API</title>
    <style>
      :root {
        --bg: #eef1f6;
        --card: #ffffff;
        --text: #0f172a;
        --muted: #475569;
        --border: #d7deea;
        --link: #1d4ed8;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", Tahoma, Arial, sans-serif;
        color: var(--text);
        background: radial-gradient(circle at 0% 0%, #f8fafc 0%, var(--bg) 62%);
        padding: 24px;
      }
      .wrap {
        max-width: 980px;
        margin: 24px auto;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 10px 35px rgba(15, 23, 42, 0.06);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 38px;
        letter-spacing: 0.2px;
      }
      p {
        margin: 8px 0;
        color: var(--muted);
        font-size: 17px;
        line-height: 1.6;
      }
      .row {
        margin-top: 14px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .pill {
        border: 1px solid var(--border);
        background: #f8fafc;
        border-radius: 999px;
        padding: 6px 12px;
        color: #1e293b;
        font-size: 13px;
        font-weight: 700;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        margin-top: 24px;
      }
      .panel {
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        background: #fbfdff;
      }
      h2 {
        margin: 0 0 12px;
        font-size: 24px;
      }
      ul {
        margin: 0;
        padding-left: 20px;
      }
      li {
        margin: 8px 0;
        color: var(--muted);
      }
      a {
        color: var(--link);
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      code {
        font-family: Consolas, Monaco, monospace;
        font-size: 13px;
        background: #f1f5f9;
        border: 1px solid var(--border);
        border-radius: 7px;
        padding: 3px 8px;
      }
      @media (max-width: 880px) {
        .grid {
          grid-template-columns: 1fr;
        }
        h1 {
          font-size: 30px;
        }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <h1>Omni Backend API</h1>
        <p>This service powers all Omni apps and provides auth, profile, booking, and dashboard APIs.</p>
        <div class="row">
          <span class="pill">Status: Running</span>
          <span class="pill">Environment: ${environment}</span>
          <span class="pill">Requested path: <code>${safePath}</code></span>
        </div>
        <div class="grid">
          <article class="panel">
            <h2>Useful Endpoints</h2>
            <ul>
              <li><a href="${backendUrl}" target="_blank" rel="noreferrer">GET /</a></li>
              <li><a href="${apiUrl}" target="_blank" rel="noreferrer">GET /api</a></li>
              <li><a href="${healthUrl}" target="_blank" rel="noreferrer">GET /api/health</a></li>
              <li><a href="${configUrl}" target="_blank" rel="noreferrer">GET /api/config</a></li>
            </ul>
          </article>
          <article class="panel">
            <h2>Frontend Apps</h2>
            <ul>
              <li><a href="${landingUrl}" target="_blank" rel="noreferrer">Landing App</a></li>
              <li><a href="${customerUrl}" target="_blank" rel="noreferrer">Customer App</a></li>
              <li><a href="${brokerUrl}" target="_blank" rel="noreferrer">Broker App</a></li>
              <li><a href="${workerUrl}" target="_blank" rel="noreferrer">Worker App</a></li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function requestWantsHtml(req) {
  const accept = String(req.headers.accept || "").toLowerCase();
  return accept.includes("text/html");
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

app.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");
  const info = getPublicConfig();
  if (requestWantsHtml(req)) {
    res.type("html").send(buildUiHtml({ info, requestedPath: "/" }));
    return;
  }
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

app.get("/api", (req, res) => {
  res.set("Cache-Control", "no-store");
  const info = getPublicConfig();
  if (requestWantsHtml(req)) {
    res.type("html").send(buildUiHtml({ info, requestedPath: "/api" }));
    return;
  }
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
