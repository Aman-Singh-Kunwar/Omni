import mongoose from "mongoose";

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

const pendingPasswordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, required: true, enum: ["customer", "broker", "worker"] },
    resetCodeHash: { type: String, required: true },
    resetCodeExpiresAt: { type: Date, required: true },
    failedAttempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

pendingPasswordResetSchema.pre("validate", function preValidatePendingPasswordReset() {
  this.email = normalizeString(this.email).toLowerCase();
  this.role = normalizeString(this.role);
});

pendingPasswordResetSchema.index({ email: 1, role: 1 }, { unique: true });
pendingPasswordResetSchema.index({ resetCodeExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PendingPasswordReset", pendingPasswordResetSchema);
