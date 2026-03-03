import mongoose from "mongoose";

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

const pendingEmailChangeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, required: true, enum: ["customer", "broker", "worker"] },
    currentEmail: { type: String, required: true, lowercase: true, trim: true },
    nextEmail: { type: String, required: true, lowercase: true, trim: true },
    verificationCodeHash: { type: String, required: true },
    verificationCodeExpiresAt: { type: Date, required: true },
    failedAttempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

pendingEmailChangeSchema.pre("validate", function preValidatePendingEmailChange() {
  this.role = normalizeString(this.role);
  this.currentEmail = normalizeString(this.currentEmail).toLowerCase();
  this.nextEmail = normalizeString(this.nextEmail).toLowerCase();
});

pendingEmailChangeSchema.index({ userId: 1, role: 1, nextEmail: 1 }, { unique: true });
pendingEmailChangeSchema.index({ verificationCodeExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PendingEmailChange", pendingEmailChangeSchema);
