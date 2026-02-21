import { Server } from "socket.io";
import User from "./models/User.js";
import { verifyToken } from "./routes/helpers.js";
import logger from "./utils/logger.js";

const isProductionEnv = String(process.env.NODE_ENV || "").toLowerCase() === "production";

const DEFAULT_ALLOWED_ORIGINS = [
  isProductionEnv ? "https://omni-landing-page.onrender.com" : "http://localhost:5173",
  isProductionEnv ? "https://omni-customer.onrender.com" : "http://localhost:5174",
  isProductionEnv ? "https://omni-broker.onrender.com" : "http://localhost:5175",
  isProductionEnv ? "https://omni-worker.onrender.com" : "http://localhost:5176"
];

let ioInstance = null;

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeTopicKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

function extractTokenFromSocket(socket) {
  const authToken = String(socket.handshake?.auth?.token || "").trim();
  if (authToken) {
    return authToken;
  }

  const queryToken = String(socket.handshake?.query?.token || "").trim();
  if (queryToken) {
    return queryToken;
  }

  const authHeader = String(socket.handshake?.headers?.authorization || "").trim();
  const [type, token] = authHeader.split(" ");
  if (type?.toLowerCase() === "bearer" && token) {
    return token;
  }

  return "";
}

function getAllowedOrigins() {
  const configuredOrigins = [
    process.env.LANDING_APP_URL,
    process.env.CUSTOMER_APP_URL,
    process.env.BROKER_APP_URL,
    process.env.WORKER_APP_URL
  ]
    .map((value) => normalizeBaseUrl(value))
    .filter(Boolean);

  const defaults = DEFAULT_ALLOWED_ORIGINS.map((value) => normalizeBaseUrl(value)).filter(Boolean);
  return new Set([...defaults, ...configuredOrigins]);
}

function addRoomIfPresent(socket, room) {
  const normalized = String(room || "").trim();
  if (!normalized) {
    return;
  }
  socket.join(normalized);
}

async function authenticateSocketConnection(socket, next) {
  const token = extractTokenFromSocket(socket);
  if (!token) {
    return next(new Error("Missing auth token."));
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (_error) {
    return next(new Error("Invalid or expired token."));
  }

  const user = await User.findById(payload.sub)
    .select({
      _id: 1,
      role: 1,
      email: 1,
      workerProfile: 1,
      brokerProfile: 1
    })
    .lean();
  if (!user) {
    return next(new Error("User not found."));
  }

  socket.data.authUser = {
    id: String(user._id),
    role: String(user.role || ""),
    email: String(user.email || "").trim().toLowerCase(),
    workerProfile: user.workerProfile || {},
    brokerProfile: user.brokerProfile || {}
  };
  return next();
}

function joinAuthenticatedRooms(socket) {
  const authUser = socket.data?.authUser;
  if (!authUser?.id || !authUser?.role) {
    return;
  }

  addRoomIfPresent(socket, `user:${authUser.id}`);
  addRoomIfPresent(socket, `role:${authUser.role}`);
  addRoomIfPresent(socket, `role:${authUser.role}:${authUser.id}`);

  if (authUser.email) {
    addRoomIfPresent(socket, `email:${authUser.email}`);
  }

  if (authUser.role === "worker") {
    const services = Array.isArray(authUser.workerProfile?.servicesProvided) ? authUser.workerProfile.servicesProvided : [];
    services.forEach((service) => {
      const topicKey = normalizeTopicKey(service);
      if (topicKey) {
        addRoomIfPresent(socket, `service:${topicKey}`);
      }
    });
  }

  if (authUser.role === "broker") {
    const brokerCode = String(authUser.brokerProfile?.brokerCode || "")
      .trim()
      .toUpperCase();
    if (brokerCode) {
      addRoomIfPresent(socket, `broker-code:${brokerCode}`);
    }
    addRoomIfPresent(socket, `broker:${authUser.id}`);
  }
}

function setupSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      await authenticateSocketConnection(socket, next);
    } catch (error) {
      return next(new Error(error?.message || "Socket authentication failed."));
    }
    return undefined;
  });

  io.on("connection", (socket) => {
    joinAuthenticatedRooms(socket);

    const authUser = socket.data?.authUser || {};
    logger.info("Socket connected", {
      socketId: socket.id,
      userId: authUser.id || "",
      role: authUser.role || ""
    });

    socket.on("disconnect", (reason) => {
      logger.info("Socket disconnected", {
        socketId: socket.id,
        userId: authUser.id || "",
        role: authUser.role || "",
        reason
      });
    });
  });
}

function initSocketServer(httpServer) {
  if (ioInstance) {
    return ioInstance;
  }

  const allowedOrigins = getAllowedOrigins();
  ioInstance = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(normalizeBaseUrl(origin))) {
          callback(null, true);
          return;
        }
        callback(new Error("Socket origin not allowed by CORS."));
      },
      methods: ["GET", "POST"]
    }
  });

  setupSocketHandlers(ioInstance);
  logger.info("Socket.IO server initialized", {
    allowedOrigins: [...allowedOrigins]
  });
  return ioInstance;
}

function getSocketServer() {
  return ioInstance;
}

export { getSocketServer, initSocketServer };
