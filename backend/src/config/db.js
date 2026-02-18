import mongoose from "mongoose";
import logger from "../utils/logger.js";
async function connectMongo() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    logger.warnOnce("mongo_uri_missing", "MONGODB_URI not set. API will run without a MongoDB connection.");
    return;
  }

  try {
    logger.infoOnce("mongo_connecting", "Connecting to MongoDB");
    await mongoose.connect(uri);
    if (process.env.SYNC_INDEXES !== "false") {
      logger.infoOnce("mongo_sync_indexes", "Running mongoose syncIndexes");
      await mongoose.syncIndexes();
    }
    logger.infoOnce("mongo_connected", "MongoDB connected");
  } catch (error) {
    logger.errorOnce(`mongo_connection_failed:${error?.message || "unknown"}`, "MongoDB connection failed", {
      message: error?.message || "Unknown MongoDB error",
      stack: error?.stack
    });
    process.exit(1);
  }
}

export default connectMongo;
