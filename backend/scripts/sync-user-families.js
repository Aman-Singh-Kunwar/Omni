import dotenv from "dotenv";
import mongoose from "mongoose";
import { syncAllUserFamilies } from "../src/utils/userSync.js";

dotenv.config({ path: "./.env" });

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is required to run sync-user-families.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const summary = await syncAllUserFamilies();
    console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, message: error?.message || "Unknown error" }, null, 2));
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
