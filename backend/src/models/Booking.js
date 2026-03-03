import mongoose from "mongoose";
const BROKER_CODE_REGEX = /^[A-Z0-9]{6}$/;
const DEFAULT_BROKER_COMMISSION_RATE = 5;
const REVIEW_MEDIA_MAX_ITEMS = 4;
const REVIEW_IMAGE_DATA_URL_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;
const REVIEW_VIDEO_DATA_URL_REGEX = /^data:video\/(mp4|webm|ogg|quicktime);base64,[a-z0-9+/=\s]+$/i;
const REVIEW_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const REVIEW_VIDEO_MAX_BYTES = 8 * 1024 * 1024;
const REVIEW_MEDIA_TOTAL_MAX_BYTES = 10 * 1024 * 1024;

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

function estimateBase64Bytes(base64Payload = "") {
  const normalized = String(base64Payload || "").replace(/\s+/g, "");
  if (!normalized) {
    return 0;
  }
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function buildReviewMediaValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normalizeFeedbackMedia(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedMedia = [];
  const limitedItems = value.slice(0, REVIEW_MEDIA_MAX_ITEMS);
  let totalBytes = 0;

  limitedItems.forEach((item) => {
    const dataUrl = normalizeString(item?.dataUrl);
    if (!dataUrl) {
      return;
    }

    let kind = "";
    let maxBytes = 0;
    if (REVIEW_IMAGE_DATA_URL_REGEX.test(dataUrl)) {
      kind = "image";
      maxBytes = REVIEW_IMAGE_MAX_BYTES;
    } else if (REVIEW_VIDEO_DATA_URL_REGEX.test(dataUrl)) {
      kind = "video";
      maxBytes = REVIEW_VIDEO_MAX_BYTES;
    } else {
      throw buildReviewMediaValidationError("Review media must be PNG/JPG/WEBP/GIF image or MP4/WEBM/OGG/MOV video.");
    }

    const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/i);
    const mimeType = normalizeString(mimeMatch?.[1] || "");
    const base64Part = dataUrl.split(",")[1] || "";
    const mediaBytes = estimateBase64Bytes(base64Part);
    if (mediaBytes > maxBytes) {
      throw buildReviewMediaValidationError(
        kind === "image" ? "Each review image must be 3MB or less." : "Each review video must be 8MB or less."
      );
    }
    totalBytes += mediaBytes;
    if (totalBytes > REVIEW_MEDIA_TOTAL_MAX_BYTES) {
      throw buildReviewMediaValidationError("Total review media size must be 10MB or less.");
    }

    normalizedMedia.push({
      kind,
      mimeType,
      dataUrl
    });
  });

  return normalizedMedia;
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
    locationLat: { type: Number, default: null },
    locationLng: { type: Number, default: null },
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
    feedbackMedia: {
      type: [
        {
          _id: false,
          kind: { type: String, enum: ["image", "video"], required: true },
          mimeType: { type: String, trim: true, default: "" },
          dataUrl: { type: String, trim: true, required: true, maxlength: 18000000 }
        }
      ],
      default: []
    },
    hiddenForCustomer: { type: Boolean, default: false },
    hiddenForCustomerAt: { type: Date },
    chatMessages: {
      type: [
        {
          _id: false,
          messageId: { type: String, required: true },
          senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          senderName: { type: String, required: true, trim: true },
          senderRole: { type: String, enum: ["customer", "worker"], required: true },
          text: { type: String, required: true, trim: true, maxlength: 1000 },
          edited: { type: Boolean, default: false },
          timestamp: { type: Date, default: Date.now }
        }
      ],
      default: []
    }
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
  this.feedback = normalizeString(this.feedback);
  this.feedbackMedia = normalizeFeedbackMedia(this.feedbackMedia);
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
