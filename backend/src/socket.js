import { Server } from "socket.io";
import Booking from "./models/Booking.js";
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
      name: 1,
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
    name: String(user.name || "").trim(),
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

    socket.on("join:booking", (bookingId) => {
      const normalizedId = String(bookingId || "").trim();
      if (normalizedId) {
        addRoomIfPresent(socket, `booking:${normalizedId}`);
      }
    });

    socket.on("worker:location", (data) => {
      if (!authUser?.id || authUser.role !== "worker") {
        return;
      }
      const bookingId = String(data?.bookingId || "").trim();
      const lat = Number(data?.lat);
      const lng = Number(data?.lng);
      if (!bookingId || !Number.isFinite(lat) || !Number.isFinite(lng) ||
          lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return;
      }
      io.to(`booking:${bookingId}`).emit("worker:location", {
        bookingId,
        workerId: authUser.id,
        lat,
        lng,
        updatedAt: new Date().toISOString()
      });
    });

    socket.on("chat:send", async (data) => {
      if (!authUser?.id || !["customer", "worker"].includes(authUser.role)) {
        return;
      }
      const chatBookingId = String(data?.bookingId || "").trim();
      const text = String(data?.text || "").trim().slice(0, 1000);
      if (!chatBookingId || !text) {
        return;
      }

      try {
        const booking = await Booking.findById(chatBookingId)
          .select({ customerId: 1, workerId: 1, status: 1 })
          .lean();
        if (!booking) {
          return;
        }
        const chatEligible = new Set(["confirmed", "in-progress", "upcoming"]);
        if (!chatEligible.has(booking.status)) {
          return;
        }
        const isParticipant =
          (booking.customerId && String(booking.customerId) === authUser.id) ||
          (booking.workerId && String(booking.workerId) === authUser.id);
        if (!isParticipant) {
          return;
        }

        const clientMsgId = String(data?.clientMsgId || "").trim().slice(0, 64);
        const messageId = clientMsgId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const timestamp = new Date();
        await Booking.updateOne(
          { _id: chatBookingId },
          { $push: { chatMessages: { $each: [{ messageId, senderId: authUser.id, senderName: authUser.name || "User", senderRole: authUser.role, text, timestamp }], $slice: -200 } } }
        );

        io.to(`booking:${chatBookingId}`).emit("chat:message", {
          bookingId: chatBookingId,
          messageId,
          senderName: authUser.name || "User",
          senderRole: authUser.role,
          text,
          timestamp: timestamp.toISOString()
        });
      } catch (_error) {
        // Ignore chat persistence errors — do not crash the socket.
      }
    });

    socket.on("chat:read", (data) => {
      if (!authUser?.id || !["customer", "worker"].includes(authUser.role)) return;
      const chatBookingId = String(data?.bookingId || "").trim();
      if (!chatBookingId) return;
      socket.to(`booking:${chatBookingId}`).emit("chat:read", {
        bookingId: chatBookingId,
        readerRole: authUser.role
      });
    });

    socket.on("chat:delete", async (data) => {
      if (!authUser?.id || !["customer", "worker"].includes(authUser.role)) return;
      const chatBookingId = String(data?.bookingId || "").trim();
      const rawIds = Array.isArray(data?.messageIds) ? data.messageIds : [];
      const messageIds = rawIds.map(String).filter(Boolean).slice(0, 50);
      if (!chatBookingId || !messageIds.length) return;
      try {
        const booking = await Booking.findById(chatBookingId)
          .select({ customerId: 1, workerId: 1 })
          .lean();
        if (!booking) return;
        const isParticipant =
          (booking.customerId && String(booking.customerId) === authUser.id) ||
          (booking.workerId && String(booking.workerId) === authUser.id);
        if (!isParticipant) return;
        await Booking.updateOne(
          { _id: chatBookingId },
          { $pull: { chatMessages: { messageId: { $in: messageIds }, senderId: authUser.id } } }
        );
        io.to(`booking:${chatBookingId}`).emit("chat:deleted", { bookingId: chatBookingId, messageIds });
      } catch (_error) {
        // Ignore delete errors.
      }
    });

    socket.on("chat:edit", async (data) => {
      if (!authUser?.id || !["customer", "worker"].includes(authUser.role)) return;
      const chatBookingId = String(data?.bookingId || "").trim();
      const messageId = String(data?.messageId || "").trim();
      const newText = String(data?.text || "").trim().slice(0, 1000);
      if (!chatBookingId || !messageId || !newText) return;
      try {
        const booking = await Booking.findById(chatBookingId)
          .select({ customerId: 1, workerId: 1 })
          .lean();
        if (!booking) return;
        const isParticipant =
          (booking.customerId && String(booking.customerId) === authUser.id) ||
          (booking.workerId && String(booking.workerId) === authUser.id);
        if (!isParticipant) return;
        const result = await Booking.updateOne(
          { _id: chatBookingId, chatMessages: { $elemMatch: { messageId, senderId: authUser.id } } },
          { $set: { "chatMessages.$.text": newText, "chatMessages.$.edited": true } }
        );
        if (!result.modifiedCount) return;
        io.to(`booking:${chatBookingId}`).emit("chat:edited", {
          bookingId: chatBookingId,
          messageId,
          text: newText
        });
      } catch (_error) {
        // Ignore edit errors.
      }
    });

    socket.on("chat:presence", (data) => {
      if (!authUser?.id || !["customer", "worker"].includes(authUser.role)) return;
      const chatBookingId = String(data?.bookingId || "").trim();
      if (!chatBookingId) return;
      socket.to(`booking:${chatBookingId}`).emit("chat:presence", {
        bookingId: chatBookingId,
        senderRole: authUser.role,
        online: Boolean(data?.online)
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
