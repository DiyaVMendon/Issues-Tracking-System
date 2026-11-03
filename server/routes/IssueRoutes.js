import express from "express";
import {
  createIssue,
  deleteIssue,
  getIssues,
  getIssueById,
  getIssueComments,
  addIssueComment,
  deleteIssueAttachment,
  updateIssue,
} from "../controllers/IssueController.js";
import uploads from "../middleware/upload.js";
import { verifyToken } from "../middleware/verifyToken.js";

const route = express.Router();

route.post("/create-issue", uploads.single("issue_image"), createIssue);
route.get("/", verifyToken, getIssues);
route.get("/:id/comments", verifyToken, getIssueComments);
route.post("/:id/comments", verifyToken, addIssueComment);
route.delete("/:id/attachment", verifyToken, deleteIssueAttachment);
route.get("/get-issue/:id", getIssueById);
route.put("/update-issue/:id", verifyToken, updateIssue);
route.delete("/delete-issue/:id", deleteIssue);

export default route;