import { getSocketServer } from "../socket.js";
import logger from "../utils/logger.js";

function normalizeTopicKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

function normalizeBrokerCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function buildBookingPayload(booking, action = "updated") {
  return {
    action,
    bookingId: String(booking?._id || booking?.id || ""),
    status: String(booking?.status || ""),
    service: String(booking?.service || ""),
    customerId: booking?.customerId ? String(booking.customerId) : "",
    workerId: booking?.workerId ? String(booking.workerId) : "",
    brokerId: booking?.brokerId ? String(booking.brokerId) : "",
    brokerCode: normalizeBrokerCode(booking?.brokerCode),
    updatedAt: new Date().toISOString()
  };
}

function emitBookingRealtimeEvent(booking, options = {}) {
  const io = getSocketServer();
  if (!io || !booking) {
    return;
  }

  const action = String(options.action || "updated").trim().toLowerCase() || "updated";
  const audience = String(options.audience || "all").trim().toLowerCase() || "all";
  const payload = buildBookingPayload(booking, action);
  if (!payload.bookingId) {
    return;
  }

  const rooms = new Set([`booking:${payload.bookingId}`]);
  if (audience === "all" || audience === "customer") {
    if (payload.customerId) {
      rooms.add(`user:${payload.customerId}`);
    }
  }

  if (audience === "all" || audience === "worker") {
    if (payload.workerId) {
      rooms.add(`user:${payload.workerId}`);
    }

    const serviceKey = normalizeTopicKey(payload.service);
    if (serviceKey) {
      rooms.add(`service:${serviceKey}`);
    }
  }

  if (audience === "all" || audience === "broker") {
    if (payload.brokerId) {
      rooms.add(`user:${payload.brokerId}`);
      rooms.add(`broker:${payload.brokerId}`);
    }
    if (payload.brokerCode) {
      rooms.add(`broker-code:${payload.brokerCode}`);
    }
  }

  rooms.forEach((room) => {
    io.to(room).emit("booking:changed", payload);
  });

  logger.info("Booking realtime event emitted", {
    bookingId: payload.bookingId,
    action,
    audience,
    status: payload.status,
    rooms: [...rooms]
  });
}

export { emitBookingRealtimeEvent };
