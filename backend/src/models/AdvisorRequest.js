import mongoose from "mongoose";

const advisorRequestSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phoneNumber: { type: String, required: true, trim: true, maxlength: 20 },
    category: { type: String, required: true, trim: true, maxlength: 120 },
    selectedPlan: { type: String, default: "", trim: true, maxlength: 120 },
    preferredTime: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, default: "", trim: true, maxlength: 600 },
    status: {
      type: String,
      enum: ["new", "in-progress", "resolved"],
      default: "new"
    }
  },
  {
    timestamps: true,
    collection: "advisorRequests"
  }
);

advisorRequestSchema.index({ status: 1, createdAt: -1 });
advisorRequestSchema.index({ customerId: 1, createdAt: -1 });
advisorRequestSchema.index({ category: 1, createdAt: -1 });

export default mongoose.model("AdvisorRequest", advisorRequestSchema);
