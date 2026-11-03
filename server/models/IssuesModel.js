import mongoose from "mongoose";

const IssueSchema = new mongoose.Schema({
    issue_title:{type:String,required:true},
    description:{type:String,required:true},
    priority:{type:String,required:true},
    status:{type:String,required:true,default:"Open"},
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    due_date:{type:Date},
    issue_image:{type:String,default:""},
},{timestamps:true})

export default mongoose.model("issue",IssueSchema)