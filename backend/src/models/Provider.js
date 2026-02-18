import mongoose from "mongoose";
function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

const providerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, default: "worker", enum: ["worker"] },
    service: { type: String, required: true, trim: true, maxlength: 120 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, default: 0, min: 0 },
    jobsCompleted: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

providerSchema.pre("validate", function preValidateProvider(next) {
  this.name = normalizeString(this.name);
  this.service = normalizeString(this.service);
  this.rating = Number.isFinite(Number(this.rating)) ? Number(this.rating) : 0;
  this.reviews = Number.isFinite(Number(this.reviews)) ? Math.max(0, Math.round(Number(this.reviews))) : 0;
  this.hourlyRate = Number.isFinite(Number(this.hourlyRate)) ? Math.max(0, Number(this.hourlyRate)) : 0;
  this.jobsCompleted = Number.isFinite(Number(this.jobsCompleted)) ? Math.max(0, Math.round(Number(this.jobsCompleted))) : 0;
  next();
});

providerSchema.index({ service: 1, rating: -1 });
providerSchema.index({ name: 1, service: 1 });

export default mongoose.model("Provider", providerSchema);
