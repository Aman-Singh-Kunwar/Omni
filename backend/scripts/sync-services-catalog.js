import dotenv from "dotenv";
import mongoose from "mongoose";
import Service from "../src/models/Service.js";
import User from "../src/models/User.js";
import { SERVICE_CATALOG, SERVICE_NAMES, normalizeServices } from "../src/config/serviceCatalog.js";

dotenv.config({ path: "./.env" });

function areEqualArrays(first, second) {
  if (first.length !== second.length) {
    return false;
  }
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return false;
    }
  }
  return true;
}

async function syncWorkerServices() {
  const workers = await User.find({ role: "worker" })
    .select({ _id: 1, "workerProfile.servicesProvided": 1 })
    .lean();

  const providerCounts = new Map(SERVICE_NAMES.map((serviceName) => [serviceName, 0]));
  let workersUpdated = 0;

  for (const worker of workers) {
    const currentServices = Array.isArray(worker?.workerProfile?.servicesProvided) ? worker.workerProfile.servicesProvided : [];
    const normalizedServices = normalizeServices(currentServices);

    normalizedServices.forEach((serviceName) => {
      providerCounts.set(serviceName, (providerCounts.get(serviceName) || 0) + 1);
    });

    if (areEqualArrays(currentServices, normalizedServices)) {
      continue;
    }

    await User.updateOne(
      { _id: worker._id, role: "worker" },
      { $set: { "workerProfile.servicesProvided": normalizedServices } }
    );
    workersUpdated += 1;
  }

  return { workersScanned: workers.length, workersUpdated, providerCounts };
}

async function syncServiceCollection(providerCounts) {
  let inserted = 0;
  let updated = 0;

  for (const service of SERVICE_CATALOG) {
    const providers = providerCounts.get(service.name) || 0;
    const result = await Service.updateOne(
      { name: service.name },
      {
        $set: {
          name: service.name,
          category: service.category,
          basePrice: service.basePrice,
          rating: service.rating,
          providers
        }
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      inserted += 1;
    } else if (result.modifiedCount > 0) {
      updated += 1;
    }
  }

  const removedResult = await Service.deleteMany({ name: { $nin: SERVICE_NAMES } });
  return { inserted, updated, removed: removedResult.deletedCount || 0 };
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to run sync-services-catalog.");
  }

  await mongoose.connect(mongoUri);

  try {
    const workerSummary = await syncWorkerServices();
    const serviceSummary = await syncServiceCollection(workerSummary.providerCounts);

    console.log(
      JSON.stringify(
        {
          ok: true,
          catalogSize: SERVICE_NAMES.length,
          serviceNames: SERVICE_NAMES,
          workersScanned: workerSummary.workersScanned,
          workersUpdated: workerSummary.workersUpdated,
          servicesInserted: serviceSummary.inserted,
          servicesUpdated: serviceSummary.updated,
          servicesRemoved: serviceSummary.removed
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
