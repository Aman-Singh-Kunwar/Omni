import mongoose from "mongoose";
const BROKER_CODE_REGEX = /^[A-Z0-9]{6}$/;
const DEFAULT_BROKER_COMMISSION_RATE = 5;

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

function normalizeWorkerServices(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map((item) => normalizeString(item)).filter(Boolean))];
}

function roundInr(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric);
}

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  if (numeric > 100) {
    return 100;
  }
  return numeric;
}

function hasLinkedBroker(booking) {
  return Boolean((booking?.brokerId && String(booking.brokerId).trim()) || normalizeBrokerCode(booking?.brokerCode));
}

function getBookingTotalAmount(booking) {
  const originalAmount = Number(booking?.originalAmount);
  if (Number.isFinite(originalAmount) && originalAmount > 0) {
    return roundInr(originalAmount);
  }

  const amount = Number(booking?.amount);
  const discountAmount = Number(booking?.discountAmount);
  if (Number.isFinite(amount) && amount >= 0) {
    if (Number.isFinite(discountAmount) && discountAmount >= 0) {
      return roundInr(amount + discountAmount);
    }
    return roundInr(amount);
  }

  return 0;
}

const bookingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    service: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    workerName: { type: String, default: "", trim: true },
    workerEmail: { type: String, default: "", trim: true },
    workerPhone: { type: String, default: "", trim: true },
    workerServices: { type: [String], default: [] },
    rejectedByWorkerIds: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
    brokerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    brokerCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      maxlength: 6,
      validate: {
        validator(value) {
          if (value === undefined || value === null || value === "") {
            return true;
          }
          return BROKER_CODE_REGEX.test(String(value).trim().toUpperCase());
        },
        message: "Broker code must be exactly 6 alphanumeric characters."
      }
    },
    brokerName: { type: String, default: "Omni Broker", trim: true },
    brokerCommissionRate: { type: Number, min: 0, max: 100, default: DEFAULT_BROKER_COMMISSION_RATE },
    brokerCommissionAmount: { type: Number, min: 0, default: 0 },
    location: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "confirmed", "in-progress", "completed", "cancelled", "upcoming", "failed", "not-provided"]
    },
    amount: { type: Number, required: true, min: 0 },
    originalAmount: { type: Number, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100, default: 5 },
    discountAmount: { type: Number, min: 0, default: 0 },
    rating: { type: Number, min: 0, max: 5 },
    feedback: { type: String, default: "", trim: true, maxlength: 500 },
    hiddenForCustomer: { type: Boolean, default: false },
    hiddenForCustomerAt: { type: Date }
  },
  { timestamps: true }
);

bookingSchema.pre("validate", async function preValidateBooking() {
  this.service = normalizeString(this.service);
  this.customerName = normalizeString(this.customerName);
  this.workerName = normalizeString(this.workerName);
  this.workerEmail = normalizeString(this.workerEmail).toLowerCase();
  this.workerPhone = normalizeString(this.workerPhone);
  this.workerServices = normalizeWorkerServices(this.workerServices);
  this.brokerName = normalizeString(this.brokerName) || "Omni Broker";
  this.brokerCode = normalizeBrokerCode(this.brokerCode);
  this.location = normalizeString(this.location);
  this.description = normalizeString(this.description);
  this.date = normalizeString(this.date);
  this.time = normalizeString(this.time);

  const UserModel = mongoose.models.User;
  if (UserModel && this.brokerCode && !this.brokerId) {
    const broker = await UserModel.findOne({
      role: "broker",
      "brokerProfile.brokerCode": this.brokerCode
    })
      .select({ _id: 1, name: 1 })
      .lean();
    if (broker) {
      this.brokerId = broker._id;
      this.brokerName = broker.name || this.brokerName;
    }
  }

  if (UserModel && this.brokerId && !this.brokerCode) {
    const broker = await UserModel.findOne({
      _id: this.brokerId,
      role: "broker"
    })
      .select({ name: 1, brokerProfile: 1 })
      .lean();
    if (broker) {
      this.brokerCode = normalizeBrokerCode(broker.brokerProfile?.brokerCode);
      this.brokerName = broker.name || this.brokerName;
    }
  }

  const totalAmount = getBookingTotalAmount(this);
  this.originalAmount = totalAmount;

  this.discountPercent = clampPercent(this.discountPercent);
  this.discountAmount = roundInr(totalAmount * (this.discountPercent / 100));
  this.amount = Math.max(0, roundInr(totalAmount - this.discountAmount));

  this.brokerCommissionRate = clampPercent(
    Number.isFinite(Number(this.brokerCommissionRate)) ? this.brokerCommissionRate : DEFAULT_BROKER_COMMISSION_RATE
  );
  if (this.status === "completed" && hasLinkedBroker(this)) {
    this.brokerCommissionAmount = roundInr(totalAmount * (this.brokerCommissionRate / 100));
  } else if (!hasLinkedBroker(this)) {
    this.brokerCommissionAmount = 0;
  } else {
    this.brokerCommissionAmount = Math.max(0, roundInr(this.brokerCommissionAmount));
  }

  if (this.rating !== undefined && this.rating !== null) {
    const numericRating = Number(this.rating);
    this.rating = Number.isFinite(numericRating) ? numericRating : undefined;
  }
});

bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ workerId: 1, createdAt: -1 });
bookingSchema.index({ workerName: 1, createdAt: -1 });
bookingSchema.index({ brokerId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ brokerCode: 1, status: 1, createdAt: -1 });

export default mongoose.model("Booking", bookingSchema);
