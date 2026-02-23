import Booking from "../../models/Booking.js";
import User from "../../models/User.js";
import { safeNormalizeBrokerCode } from "./common.js";

const BROKER_CODE_LENGTH = 6;
const BROKER_CODE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const WORKER_BROKER_COMMISSION_JOB_LIMIT = 10;

function generateBrokerCode() {
  let code = "";
  for (let i = 0; i < BROKER_CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * BROKER_CODE_CHARSET.length);
    code += BROKER_CODE_CHARSET[index];
  }
  return code;
}

async function generateUniqueBrokerCode(excludeUserId = null) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const nextCode = generateBrokerCode();
    const filter = {
      role: "broker",
      "brokerProfile.brokerCode": nextCode
    };
    if (excludeUserId) {
      filter._id = { $ne: excludeUserId };
    }

    const existing = await User.findOne(filter).select({ _id: 1 }).lean();
    if (!existing) {
      return nextCode;
    }
  }

  const error = new Error("Unable to generate a unique broker code. Please try again.");
  error.statusCode = 500;
  throw error;
}

async function ensureBrokerCodeForUser(user) {
  if (!user || user.role !== "broker") {
    return user;
  }

  const currentCode = safeNormalizeBrokerCode(user.brokerProfile?.brokerCode);
  if (currentCode) {
    if (!user.brokerProfile) {
      user.brokerProfile = {};
    }
    if (user.brokerProfile.brokerCode !== currentCode) {
      user.brokerProfile.brokerCode = currentCode;
      await user.save();
    }
    return user;
  }

  if (!user.brokerProfile) {
    user.brokerProfile = {};
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      user.brokerProfile.brokerCode = await generateUniqueBrokerCode(user._id);
      await user.save();
      return user;
    } catch (error) {
      if (error?.code === 11000) {
        continue;
      }
      throw error;
    }
  }

  const error = new Error("Unable to generate broker code. Please try again.");
  error.statusCode = 500;
  throw error;
}

async function findBrokerByCode(code) {
  const normalizedCode = safeNormalizeBrokerCode(code);
  if (!normalizedCode) {
    return null;
  }

  const broker = await User.findOne({
    role: "broker",
    "brokerProfile.brokerCode": normalizedCode
  })
    .select({ _id: 1, name: 1, brokerProfile: 1 })
    .lean();

  if (!broker) {
    return null;
  }

  return {
    id: broker._id,
    name: broker.name,
    code: safeNormalizeBrokerCode(broker.brokerProfile?.brokerCode)
  };
}

async function getLinkedBrokerForWorker(worker) {
  const workerBrokerId = worker?.workerProfile?.brokerId;
  if (workerBrokerId) {
    const broker = await User.findOne({
      _id: workerBrokerId,
      role: "broker"
    }).select({ _id: 1, name: 1, brokerProfile: 1 });
    if (broker) {
      await ensureBrokerCodeForUser(broker);
    }
    const brokerCode = safeNormalizeBrokerCode(broker?.brokerProfile?.brokerCode);
    if (broker && brokerCode) {
      return {
        id: broker._id,
        name: broker.name,
        code: brokerCode
      };
    }
  }

  return findBrokerByCode(worker?.workerProfile?.brokerCode);
}

async function findAssignedWorkerForBooking(booking) {
  if (!booking) {
    return null;
  }

  if (booking.workerId) {
    const workerById = await User.findOne({ _id: booking.workerId, role: "worker" }).select({
      _id: 1,
      name: 1,
      role: 1,
      workerProfile: 1
    });
    if (workerById) {
      return workerById;
    }
  }

  const workerEmail = String(booking.workerEmail || "")
    .trim()
    .toLowerCase();
  if (workerEmail) {
    const workerByEmail = await User.findOne({ role: "worker", email: workerEmail }).select({
      _id: 1,
      name: 1,
      role: 1,
      email: 1,
      workerProfile: 1
    });
    if (workerByEmail) {
      return workerByEmail;
    }
  }

  const workerName = String(booking.workerName || "").trim();
  if (!workerName) {
    return null;
  }

  return User.findOne({ role: "worker", name: workerName })
    .sort({ updatedAt: -1, createdAt: -1 })
    .select({ _id: 1, name: 1, role: 1, email: 1, workerProfile: 1 });
}

function workerHasLinkedBroker(worker) {
  return Boolean(
    (worker?.workerProfile?.brokerId && String(worker.workerProfile.brokerId).trim()) ||
      safeNormalizeBrokerCode(worker?.workerProfile?.brokerCode)
  );
}

function getWorkerIdentityScope(worker) {
  const scope = [];
  if (worker?._id) {
    scope.push({ workerId: worker._id });
  }
  const workerName = String(worker?.name || "").trim();
  if (workerName) {
    scope.push({ workerName });
  }
  const workerEmail = String(worker?.email || "")
    .trim()
    .toLowerCase();
  if (workerEmail) {
    scope.push({ workerEmail });
  }
  return scope;
}

async function getWorkerBrokerCommissionProgress(worker) {
  const limit = WORKER_BROKER_COMMISSION_JOB_LIMIT;
  if (!worker || (worker.role && worker.role !== "worker") || !workerHasLinkedBroker(worker)) {
    return {
      usedJobs: 0,
      jobLimit: limit,
      remainingJobs: limit,
      usageLabel: `0/${limit}`,
      isLimitReached: false
    };
  }

  const workerScope = getWorkerIdentityScope(worker);
  if (!workerScope.length) {
    return {
      usedJobs: 0,
      jobLimit: limit,
      remainingJobs: limit,
      usageLabel: `0/${limit}`,
      isLimitReached: false
    };
  }

  const brokerScope = [];
  if (worker.workerProfile?.brokerId) {
    brokerScope.push({ brokerId: worker.workerProfile.brokerId });
  }
  const brokerCode = safeNormalizeBrokerCode(worker.workerProfile?.brokerCode);
  if (brokerCode) {
    brokerScope.push({ brokerCode });
  }

  const usedJobsCount = await Booking.countDocuments({
    status: "completed",
    $and: [
      { $or: workerScope },
      ...(brokerScope.length ? [{ $or: brokerScope }] : []),
      { $or: [{ brokerCommissionAmount: { $gt: 0 } }, { brokerCommissionRate: { $gt: 0 } }] }
    ]
  });

  const usedJobs = Math.min(limit, usedJobsCount);
  const remainingJobs = Math.max(0, limit - usedJobs);
  return {
    usedJobs,
    jobLimit: limit,
    remainingJobs,
    usageLabel: `${usedJobs}/${limit}`,
    isLimitReached: usedJobs >= limit
  };
}

async function getWorkersLinkedToBroker(brokerUser) {
  if (!brokerUser || brokerUser.role !== "broker") {
    return { brokerCode: "", workers: [], workerIds: [], workerNames: [], workerEmails: [] };
  }

  const brokerCode = safeNormalizeBrokerCode(brokerUser.brokerProfile?.brokerCode);
  const workerFilter = {
    role: "worker",
    $or: [{ "workerProfile.brokerId": brokerUser._id }, ...(brokerCode ? [{ "workerProfile.brokerCode": brokerCode }] : [])]
  };

  const workers = await User.find(workerFilter).sort({ updatedAt: -1, createdAt: -1 }).lean();
  const workerIds = workers.map((worker) => worker._id);
  const workerNames = workers.map((worker) => worker.name).filter(Boolean);
  const workerEmails = workers.map((worker) => String(worker.email || "").trim().toLowerCase()).filter(Boolean);

  return { brokerCode, workers, workerIds, workerNames, workerEmails };
}

function buildWorkerBookingScope(workerIds = [], workerNames = [], workerEmails = []) {
  const scope = [];
  if (workerIds.length) {
    scope.push({ workerId: { $in: workerIds } });
  }
  if (workerNames.length) {
    scope.push({ workerName: { $in: workerNames } });
  }
  if (workerEmails.length) {
    scope.push({ workerEmail: { $in: workerEmails } });
  }
  return scope;
}

export {
  buildWorkerBookingScope,
  ensureBrokerCodeForUser,
  findAssignedWorkerForBooking,
  findBrokerByCode,
  generateUniqueBrokerCode,
  getLinkedBrokerForWorker,
  getWorkerBrokerCommissionProgress,
  getWorkersLinkedToBroker
};
