import IssuesModel from "../models/IssuesModel.js";
import IssueCommentModel from "../models/IssueCommentModel.js";
import User from "../models/user.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "issue_tracking/issue_images",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
};

export const createIssue = async (req, res) => {
  
  try {
    const { issue_title, description, priority, status, assigned_to, due_date } =
    req.body;

    if (!issue_title || !description || !priority || !status || !assigned_to) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });
    }

    const imageUrl = req.file ? await uploadToCloudinary(req.file) : "";

    const issue = await IssuesModel.create({
      issue_title,
      description,
      priority,
      status,
      assigned_to,
      due_date,
      issue_image: imageUrl,
    });
    res
      .status(201)
      .json({ message: "Issue created successfully", data: issue });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getIssues = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ message: "Invalid authenticated user." });
    }

    const user = await User.findById(userId).select("role");
    if (!user) {
      return res.status(401).json({ message: "Authenticated user no longer exists." });
    }

    const isAdmin = user.role?.toLowerCase() === "admin";
    const requestedUserId = req.query.userId;
    if (!isAdmin && requestedUserId && requestedUserId !== String(user._id)) {
      return res.status(403).json({
        message: "You can only view issues assigned to your account.",
      });
    }
    if (isAdmin && requestedUserId && !mongoose.isValidObjectId(requestedUserId)) {
      return res.status(400).json({ message: "Invalid assignee userId." });
    }

    const parsePositiveInteger = (value, fallback, maximum = Number.MAX_SAFE_INTEGER) => {
      if (value === undefined) return fallback;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1) return null;
      return Math.min(parsed, maximum);
    };

    const requestedPage = parsePositiveInteger(req.query.page, 1);
    const limit = parsePositiveInteger(req.query.limit, 10, 100);
    if (!requestedPage || !limit) {
      return res.status(400).json({
        message: "Page and limit must be positive integers.",
      });
    }

    const filter = {};
    if (!isAdmin) {
      filter.assigned_to = user._id;
    } else if (requestedUserId) {
      filter.assigned_to = new mongoose.Types.ObjectId(requestedUserId);
    }

    const allowedStatuses = ["open", "in progress", "closed"];
    const status = req.query.status
      ?.toString()
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, " ");
    if (status && status !== "all") {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Unsupported issue status filter." });
      }
      if (status === "in progress") {
        filter.status = { $regex: "^in[\\s_-]*progress$", $options: "i" };
      } else if (status === "closed") {
        filter.status = { $regex: "^(closed|resolved|done)$", $options: "i" };
      } else {
        filter.status = { $regex: "^open$", $options: "i" };
      }
    }

    const priority = req.query.priority?.toString().trim().toLowerCase();
    if (priority && priority !== "all") {
      if (!["high", "medium", "low"].includes(priority)) {
        return res.status(400).json({ message: "Unsupported issue priority filter." });
      }
      filter.priority = { $regex: `^${escapeRegex(priority)}$`, $options: "i" };
    }

    const search = req.query.search?.toString().trim();
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      const searchConditions = [
        { issue_title: searchRegex },
        { description: searchRegex },
      ];
      if (mongoose.isValidObjectId(search)) {
        searchConditions.push({ _id: new mongoose.Types.ObjectId(search) });
      } else {
        const issueCodeMatch = search.match(/^#?ISS-([a-f\d]{5})$/i);
        if (issueCodeMatch) {
          searchConditions.push({
            $expr: {
              $regexMatch: {
                input: { $toString: "$_id" },
                regex: `${escapeRegex(issueCodeMatch[1])}$`,
                options: "i",
              },
            },
          });
        }
      }
      filter.$or = searchConditions;
    }

    const sort = req.query.sort || "newest";
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      dueSoonest: { due_date: 1, createdAt: -1 },
    };
    if (!sortOptions[sort]) {
      return res.status(400).json({ message: "Unsupported issue sort order." });
    }

    const summaryFilter = {};
    if (!isAdmin) summaryFilter.assigned_to = user._id;
    const [total, statusCounts] = await Promise.all([
      IssuesModel.countDocuments(filter),
      IssuesModel.aggregate([
        { $match: summaryFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: {
              $sum: {
                $cond: [
                  {
                    $not: [
                      {
                        $regexMatch: {
                          input: { $toLower: { $ifNull: ["$status", ""] } },
                          regex: "^(in[\\s_-]*progress|closed|resolved|done)$",
                        },
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            inProgress: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$status", ""] } },
                      regex: "^in[\\s_-]*progress$",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
            closed: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$status", ""] } },
                      regex: "^(closed|resolved|done)$",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const totalPages = Math.ceil(total / limit);
    const page = totalPages ? Math.min(requestedPage, totalPages) : 1;
    const issues = await IssuesModel.find(filter)
      .populate("assigned_to", "name email")
      .sort(sortOptions[sort])
      .skip((page - 1) * limit)
      .limit(limit);
    const summary = statusCounts[0] || {
      total: 0,
      open: 0,
      inProgress: 0,
      closed: 0,
    };
    return res.status(200).json({
      message: "Issues retrieved successfully",
      data: issues,
      summary: {
        total: summary.total,
        open: summary.open,
        inProgress: summary.inProgress,
        closed: summary.closed,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && totalPages > 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getIssueById = async (req, res) => {
    try{
        const {id} = req.params;
        const issue = await IssuesModel.findById(id).populate("assigned_to", "name");
        if(!issue){
            return res.status(404).json({message:"Issue not found"})
        }
        res.status(200).json({message: "Issue retrieved successfully", data: issue });
    }catch(error){
        res.status(500).json({message:error.message})
    }
}

const getAccessibleIssue = async (req, res) => {
    const userId = req.user?.id;
    if (!userId || !mongoose.isValidObjectId(userId)) {
        res.status(401).json({ message: "Invalid authenticated user." });
        return null;
    }

    const user = await User.findById(userId).select("role");
    if (!user) {
        res.status(401).json({ message: "Authenticated user no longer exists." });
        return null;
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ message: "Invalid issue ID." });
        return null;
    }

    const issue = await IssuesModel.findById(req.params.id);
    if (!issue) {
        res.status(404).json({ message: "Issue not found." });
        return null;
    }
    const isAdmin = user.role?.toLowerCase() === "admin";
    if (!isAdmin && String(issue.assigned_to) !== String(user._id)) {
        res.status(403).json({ message: "You can only comment on issues assigned to your account." });
        return null;
    }

    return issue;
};

export const getIssueComments = async (req, res) => {
    try {
        const issue = await getAccessibleIssue(req, res);
        if (!issue) return;

        const comments = await IssueCommentModel.find({ issue: issue._id })
            .populate("author", "name avatar")
            .sort({ createdAt: 1 });
        return res.status(200).json({
            message: "Issue comments retrieved successfully.",
            data: comments,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const addIssueComment = async (req, res) => {
    try {
        const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
        if (!text) {
            return res.status(400).json({ message: "Comment cannot be empty." });
        }
        if (text.length > 2000) {
            return res.status(400).json({ message: "Comment must be 2000 characters or fewer." });
        }

        const issue = await getAccessibleIssue(req, res);
        if (!issue) return;

        const comment = await IssueCommentModel.create({
            issue: issue._id,
            author: req.user.id,
            text,
        });
        await comment.populate("author", "name avatar");

        return res.status(201).json({
            message: "Comment added successfully.",
            data: comment,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updateIssue = async (req, res) => {
    try{
        const {id} = req.params;
        const { issue_title, description, priority, status, assigned_to, due_date } = req.body;

        const issue = await IssuesModel.findByIdAndUpdate(
            id,
            { issue_title, description, priority, status, assigned_to, due_date },
            { new: true }
        ).populate("assigned_to", "name");

        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        res.status(200).json({ message: "Issue updated successfully", data: issue });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteIssue = async (req, res) => {
    try{
        const {id} = req.params;
        const issue = await IssuesModel.findByIdAndDelete(id);
        if(!issue){
            return res.status(404).json({message:"Issue not found"})
        }
        res.status(200).json({message: "Issue deleted successfully", data: issue });
    }catch(error){
        res.status(500).json({message:error.message})
    }
}


