const mongoose = require("mongoose");

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 120 },
    basePrice: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    providers: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

serviceSchema.pre("validate", function preValidateService(next) {
  this.name = normalizeString(this.name);
  this.category = normalizeString(this.category);
  this.basePrice = Number.isFinite(Number(this.basePrice)) ? Number(this.basePrice) : 0;
  this.rating = Number.isFinite(Number(this.rating)) ? Number(this.rating) : 0;
  this.providers = Number.isFinite(Number(this.providers)) ? Math.max(0, Math.round(Number(this.providers))) : 0;
  next();
});

serviceSchema.index({ name: 1 }, { unique: true });
serviceSchema.index({ category: 1, rating: -1 });

module.exports = mongoose.model("Service", serviceSchema);
