const mongoose = require("mongoose");

async function connectMongo() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("MONGODB_URI not set. API will run without a MongoDB connection.");
    return;
  }

  try {
    await mongoose.connect(uri);
    if (process.env.SYNC_INDEXES !== "false") {
      await mongoose.syncIndexes();
    }
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectMongo;
