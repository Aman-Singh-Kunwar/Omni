import mongoose from "mongoose";

const BROKER_CODE_REGEX = /^[A-Z0-9]{6}$/;

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeBrokerCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return BROKER_CODE_REGEX.test(normalized) ? normalized : "";
}

const pendingSignupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["customer", "broker", "worker"] },
    brokerCode: { type: String, trim: true, uppercase: true, default: "" },
    verificationCodeHash: { type: String, required: true },
    verificationCodeExpiresAt: { type: Date, required: true },
    failedVerificationAttempts: { type: Number, default: 0 },
    verificationSendCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

pendingSignupSchema.pre("validate", function preValidatePendingSignup() {
  this.name = normalizeString(this.name);
  this.email = normalizeString(this.email).toLowerCase();
  this.brokerCode = normalizeBrokerCode(this.brokerCode);
});

pendingSignupSchema.index({ email: 1, role: 1 }, { unique: true });
pendingSignupSchema.index({ verificationCodeExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PendingSignup", pendingSignupSchema);
