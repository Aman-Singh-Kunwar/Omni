import dotenv from "dotenv";
import mongoose from "mongoose";
import Booking from "../src/models/Booking.js";

const COMMISSION_RATE_PERCENT = 5;
const WORKER_BROKER_COMMISSION_JOB_LIMIT = 10;

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase();
}

function normalizeBrokerCode(value) {
  const code = normalizeString(value).toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : "";
}

function getBookingTotalAmount(booking) {
  const originalAmount = Number(booking?.originalAmount);
  if (Number.isFinite(originalAmount) && originalAmount > 0) {
    return Math.round(originalAmount);
  }

  const amount = Number(booking?.amount);
  const discountAmount = Number(booking?.discountAmount);
  if (Number.isFinite(amount) && amount >= 0 && Number.isFinite(discountAmount) && discountAmount >= 0) {
    return Math.round(amount + discountAmount);
  }

  if (Number.isFinite(amount) && amount > 0) {
    return Math.round(amount);
  }

  return 0;
}

function buildBrokerKey(booking) {
  if (booking?.brokerId) {
    return `broker-id:${String(booking.brokerId)}`;
  }
  const code = normalizeBrokerCode(booking?.brokerCode);
  if (code) {
    return `broker-code:${code}`;
  }
  return "";
}

function buildWorkerKey(booking) {
  if (booking?.workerId) {
    return `worker-id:${String(booking.workerId)}`;
  }
  const email = normalizeLower(booking?.workerEmail);
  if (email) {
    return `worker-email:${email}`;
  }
  const name = normalizeLower(booking?.workerName);
  if (name) {
    return `worker-name:${name}`;
  }
  return "";
}

function sortBookingsAscending(a, b) {
  const aTs = a?.updatedAt ? new Date(a.updatedAt).getTime() : a?.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bTs = b?.updatedAt ? new Date(b.updatedAt).getTime() : b?.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aTs !== bTs) {
    return aTs - bTs;
  }
  const aCreated = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aCreated !== bCreated) {
    return aCreated - bCreated;
  }
  return String(a?._id || "").localeCompare(String(b?._id || ""));
}

async function run() {
  dotenv.config({ path: "./.env" });

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set.");
  }

  await mongoose.connect(mongoUri);

  try {
    const completedBookings = await Booking.find({
      status: "completed",
      $or: [{ brokerId: { $exists: true, $ne: null } }, { brokerCode: { $exists: true, $ne: "" } }]
    })
      .select({
        _id: 1,
        brokerId: 1,
        brokerCode: 1,
        workerId: 1,
        workerName: 1,
        workerEmail: 1,
        amount: 1,
        originalAmount: 1,
        discountAmount: 1,
        brokerCommissionRate: 1,
        brokerCommissionAmount: 1,
        createdAt: 1,
        updatedAt: 1
      })
      .lean();

    const groups = new Map();
    for (const booking of completedBookings) {
      const brokerKey = buildBrokerKey(booking);
      const workerKey = buildWorkerKey(booking);
      if (!brokerKey || !workerKey) {
        continue;
      }
      const groupKey = `${brokerKey}|${workerKey}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(booking);
    }

    let updatedBookings = 0;
    let commissionRemovedCount = 0;
    let commissionRestoredCount = 0;

    for (const groupBookings of groups.values()) {
      groupBookings.sort(sortBookingsAscending);

      for (let index = 0; index < groupBookings.length; index += 1) {
        const booking = groupBookings[index];
        const shouldApplyCommission = index < WORKER_BROKER_COMMISSION_JOB_LIMIT;
        const desiredRate = shouldApplyCommission ? COMMISSION_RATE_PERCENT : 0;
        const desiredAmount = shouldApplyCommission
          ? Math.round(getBookingTotalAmount(booking) * (COMMISSION_RATE_PERCENT / 100))
          : 0;

        const currentRate = Number(booking.brokerCommissionRate || 0);
        const currentAmount = Number(booking.brokerCommissionAmount || 0);
        const isRateChanged = currentRate !== desiredRate;
        const isAmountChanged = currentAmount !== desiredAmount;
        if (!isRateChanged && !isAmountChanged) {
          continue;
        }

        await Booking.updateOne(
          { _id: booking._id },
          {
            $set: {
              brokerCommissionRate: desiredRate,
              brokerCommissionAmount: desiredAmount
            }
          }
        );

        if (shouldApplyCommission && (currentRate <= 0 || currentAmount <= 0)) {
          commissionRestoredCount += 1;
        }
        if (!shouldApplyCommission && (currentRate > 0 || currentAmount > 0)) {
          commissionRemovedCount += 1;
        }
        updatedBookings += 1;
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          totalCompletedBookings: completedBookings.length,
          processedGroups: groups.size,
          updatedBookings,
          commissionRemovedCount,
          commissionRestoredCount
        },
        null,
        2
      )
    );
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error?.message || "Unknown error",
        stack: error?.stack
      },
      null,
      2
    )
  );
  process.exit(1);
});
