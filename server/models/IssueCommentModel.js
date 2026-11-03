import mongoose from "mongoose";

const issueCommentSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "issue",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

export default mongoose.model("issueComment", issueCommentSchema);
