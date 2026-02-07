const mongoose = require("mongoose");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BROKER_CODE_REGEX = /^[A-Z0-9]{6}$/;
const BROKER_CODE_LENGTH = 6;
const BROKER_CODE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

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

function normalizeServicesProvided(services) {
  if (!Array.isArray(services)) {
    return [];
  }
  return [...new Set(services.map((item) => normalizeString(item)).filter(Boolean))];
}

function normalizeRoleProfileCommon(profile = {}) {
  const next = typeof profile === "object" && profile !== null ? { ...profile } : {};
  const gender = normalizeString(next.gender).toLowerCase();
  next.bio = normalizeString(next.bio);
  next.phone = normalizeString(next.phone);
  next.gender = ["male", "female", "non-binary", "prefer_not_to_say", "other"].includes(gender) ? gender : "";
  return next;
}

function generateBrokerCode() {
  let code = "";
  for (let index = 0; index < BROKER_CODE_LENGTH; index += 1) {
    const charIndex = Math.floor(Math.random() * BROKER_CODE_CHARSET.length);
    code += BROKER_CODE_CHARSET[charIndex];
  }
  return code;
}

async function generateUniqueBrokerCode(UserModel, excludeUserId = null) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = generateBrokerCode();
    const filter = { role: "broker", "brokerProfile.brokerCode": code };
    if (excludeUserId) {
      filter._id = { $ne: excludeUserId };
    }
    const existing = await UserModel.findOne(filter).select({ _id: 1 }).lean();
    if (!existing) {
      return code;
    }
  }
  const error = new Error("Unable to generate unique broker code.");
  error.statusCode = 500;
  throw error;
}

const roleProfileBaseSchema = {
  bio: { type: String, trim: true, maxlength: 500, default: "" },
  gender: {
    type: String,
    enum: ["", "male", "female", "non-binary", "prefer_not_to_say", "other"],
    default: ""
  },
  dateOfBirth: { type: Date },
  phone: { type: String, trim: true, maxlength: 32, default: "" }
};

const customerProfileSchema = new mongoose.Schema(roleProfileBaseSchema, { _id: false });
const brokerProfileSchema = new mongoose.Schema(
  {
    ...roleProfileBaseSchema,
    brokerCode: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: 6,
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
    }
  },
  { _id: false }
);
const workerProfileSchema = new mongoose.Schema(
  {
    ...roleProfileBaseSchema,
    servicesProvided: { type: [String], default: [] },
    isAvailable: { type: Boolean, default: true },
    brokerCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 6,
      default: "",
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
    brokerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator(value) {
          return EMAIL_REGEX.test(String(value || "").trim().toLowerCase());
        },
        message: "Invalid email format."
      }
    },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["customer", "broker", "worker"] },
    lastLoginAt: { type: Date },
    customerProfile: { type: customerProfileSchema, default: () => ({}) },
    brokerProfile: { type: brokerProfileSchema, default: () => ({}) },
    workerProfile: { type: workerProfileSchema, default: () => ({}) }
  },
  { timestamps: true }
);

userSchema.pre("validate", async function preValidateUser(next) {
  try {
    this.name = normalizeString(this.name);
    this.email = normalizeString(this.email).toLowerCase();

    this.customerProfile = normalizeRoleProfileCommon(this.customerProfile);
    this.brokerProfile = normalizeRoleProfileCommon(this.brokerProfile);
    this.workerProfile = normalizeRoleProfileCommon(this.workerProfile);

    this.workerProfile.servicesProvided = normalizeServicesProvided(this.workerProfile.servicesProvided);
    this.workerProfile.brokerCode = normalizeBrokerCode(this.workerProfile.brokerCode);

    const UserModel = this.constructor;
    if (this.role === "broker") {
      const existingBrokerCode = normalizeBrokerCode(this.brokerProfile.brokerCode);
      this.brokerProfile.brokerCode = existingBrokerCode || (await generateUniqueBrokerCode(UserModel, this._id));
    } else if (!normalizeBrokerCode(this.brokerProfile.brokerCode)) {
      this.brokerProfile.brokerCode = undefined;
    }

    if (this.role === "worker") {
      if (this.workerProfile.brokerCode) {
        const broker = await UserModel.findOne({
          role: "broker",
          "brokerProfile.brokerCode": this.workerProfile.brokerCode
        })
          .select({ _id: 1 })
          .lean();
        if (!broker) {
          this.invalidate("workerProfile.brokerCode", "Broker code does not match any broker.");
        } else {
          this.workerProfile.brokerId = broker._id;
        }
      } else {
        this.workerProfile.brokerId = undefined;
      }
    } else if (!this.workerProfile.brokerCode) {
      this.workerProfile.brokerId = undefined;
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

userSchema.index({ email: 1, role: 1 }, { unique: true });
userSchema.index({ role: 1, name: 1 });
userSchema.index({ "brokerProfile.brokerCode": 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, "workerProfile.brokerCode": 1 });
userSchema.index({ role: 1, "workerProfile.brokerId": 1 });

module.exports = mongoose.model("User", userSchema);
