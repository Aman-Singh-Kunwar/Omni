import dotenv from "dotenv";
import http from "node:http";
import app from "./app.js";
import connectMongo from "./config/db.js";
import { initSocketServer } from "./socket.js";
import logger from "./utils/logger.js";
dotenv.config();

const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (reason) => {
  const reasonText = reason?.stack || String(reason);
  logger.errorOnce(`unhandled_rejection:${reasonText}`, "Unhandled promise rejection", {
    reason: reason?.stack || String(reason)
  });
});

process.on("uncaughtException", (error) => {
  logger.errorOnce(`uncaught_exception:${error?.message || "unknown"}`, "Uncaught exception", {
    message: error?.message || "Unknown error",
    stack: error?.stack
  });
  process.exit(1);
});

logger.infoOnce("backend_starting", "Starting backend", {
  port: PORT,
  nodeEnv: process.env.NODE_ENV || "development"
});

connectMongo()
  .then(() => {
    const server = http.createServer(app);
    initSocketServer(server);
    server.listen(PORT, () => {
      logger.infoOnce("backend_listening", "Backend listening", { port: PORT });
    });
  })
  .catch((error) => {
    logger.errorOnce(`startup_failed:${error?.message || "unknown"}`, "Server startup failed", {
      message: error?.message || "Unknown startup error",
      stack: error?.stack
    });
    process.exit(1);
  });
