import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    designation: { type: String, trim: true, maxlength: 80, default: "" },
    avatar: { type: String, default: "" },
    password: {
      type: String,
      required: true,
    },
    role: { type: String, default: "user" },
    isActive: { type: Boolean, default: true },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model("user", userSchema);
