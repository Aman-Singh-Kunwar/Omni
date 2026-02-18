import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import logger from "./utils/logger.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);

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
    }

    return originalJson(payload);
  };

  next();
});

app.get("/", (_req, res) => {
  res.json({ message: "Omni API is running" });
});

app.use("/api", routes);

app.use((err, req, res, _next) => {
  const statusCode = err?.statusCode || 500;
  logger.errorOnce(`route_error:${statusCode}:${req.method}:${req.originalUrl || req.url}:${err?.message || "unknown"}`, "Unhandled route error", {
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode,
    message: err?.message || "Unknown error",
    stack: err?.stack
  });

  res.status(statusCode).json({
    message: err?.message || "Internal server error"
  });
});

export default app;
