import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

const uploadAvatar = (file) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "issue_tracking/profile_avatars", resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) {
          return reject(new Error("Avatar upload did not return a URL."));
        }
        resolve(result.secure_url);
      },
    );
    Readable.from(file.buffer).pipe(uploadStream);
  });

const getAuthenticatedUser = async (req, res) => {
  const user = await User.findById(req.user?.id).select(
    "name email role phone designation avatar createdAt",
  );
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return null;
  }
  return user;
};

export const getProfile = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;
    return res.status(200).json({
      message: "Profile retrieved successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const phone =
      typeof req.body.phone === "string" ? req.body.phone.trim() : "";
    const designation =
      typeof req.body.designation === "string"
        ? req.body.designation.trim()
        : "";
    if (!name || name.length > 100) {
      return res.status(400).json({
        message: "Name is required and must be 100 characters or fewer.",
      });
    }
    if (phone.length > 30 || designation.length > 80) {
      return res.status(400).json({
        message: "Phone or designation exceeds the allowed length.",
      });
    }

    user.name = name;
    user.phone = phone;
    user.designation = designation;
    if (req.file) user.avatar = await uploadAvatar(req.file);
    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        designation: user.designation,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        message: "Current password and new password are required.",
      });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters long.",
      });
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from the current password.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const Signup = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      res.status(500).json({
        message: "User is already there",
      });
    }

    const hatchedPassword = await bcrypt.hash(password, 10);

    const data = new User({ email, name, password: hatchedPassword, role });
    await data.save();

    res.status(200).json({
      message: "User signed up successfully",
      data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error occured",
    });
  }
};

export const Login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.send(404).json({
        message: "User not found",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "This account is inactive." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return res.status(200).json({
      message: "Login Successful",
      data: token,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occured",
    });
  }
};

export const getUsers = async (req, res) => {
  const { userId } = req.query;
  try {
    const users = await User.findById(userId).select("-password");
    if (!users) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    res.status(200).json({
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error occured",
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const requester = await User.findById(req.user?.id).select("role");
    if (!requester || requester.role?.toLowerCase() !== "admin") {
      return res.status(403).json({
        message: "Only administrators can view the assignee list.",
      });
    }

    const users = await User.find({ isActive: { $ne: false } })
      .select("_id name email role")
      .sort({ name: 1 });
    return res.status(200).json({
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const getAdminRequester = async (req, res) => {
  const requester = await User.findById(req.user?.id).select("role");
  if (!requester || requester.role?.toLowerCase() !== "admin") {
    res.status(403).json({ message: "Only administrators can manage users." });
    return null;
  }
  return requester;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getManageableUserFields = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
});

export const getManagedUsers = async (req, res) => {
  try {
    const requester = await getAdminRequester(req, res);
    if (!requester) return;

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
      return res.status(400).json({ message: "Page and limit must be positive integers." });
    }
    const safeLimit = Math.min(limit, 100);
    const filter = {};
    const search = req.query.search?.toString().trim();
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const role = req.query.role?.toString().trim().toLowerCase();
    if (role && role !== "all") {
      if (role === "admin") filter.role = /^admin$/i;
      else if (role === "employee") filter.role = { $not: /^admin$/i };
      else return res.status(400).json({ message: "Unsupported role filter." });
    }

    const status = req.query.status?.toString().trim().toLowerCase();
    if (status && status !== "all") {
      if (status === "active") filter.isActive = { $ne: false };
      else if (status === "inactive") filter.isActive = false;
      else return res.status(400).json({ message: "Unsupported status filter." });
    }

    const [total, stats, users] = await Promise.all([
      User.countDocuments(filter),
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            admins: {
              $sum: { $cond: [{ $eq: [{ $toLower: { $ifNull: ["$role", ""] } }, "admin"] }, 1, 0] },
            },
            employees: {
              $sum: { $cond: [{ $ne: [{ $toLower: { $ifNull: ["$role", ""] } }, "admin"] }, 1, 0] },
            },
          },
        },
      ]),
      User.find(filter)
        .select("name email role isActive createdAt")
        .sort({ createdAt: -1, _id: 1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit),
    ]);

    const summary = stats[0] || { total: 0, admins: 0, employees: 0 };
    const totalPages = Math.ceil(total / safeLimit);
    const currentPage = totalPages ? Math.min(page, totalPages) : 1;
    return res.status(200).json({
      message: "Users retrieved successfully.",
      data: users.map(getManageableUserFields),
      summary: {
        total: summary.total,
        admins: summary.admins,
        employees: summary.employees,
      },
      pagination: {
        page: currentPage,
        limit: safeLimit,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createManagedUser = async (req, res) => {
  try {
    const requester = await getAdminRequester(req, res);
    if (!requester) return;
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (req.body?.role !== "admin" && req.body?.role !== "employee") {
      return res.status(400).json({ message: "Choose a valid user role." });
    }
    if (req.body?.isActive !== undefined && typeof req.body.isActive !== "boolean") {
      return res.status(400).json({ message: "Choose a valid account status." });
    }
    const role = req.body.role === "admin" ? "admin" : "user";
    if (!name || name.length > 100 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid name and email address." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      isActive: req.body?.isActive !== false,
    });
    return res.status(201).json({
      message: "User created successfully.",
      data: getManageableUserFields(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateManagedUser = async (req, res) => {
  try {
    const requester = await getAdminRequester(req, res);
    if (!requester) return;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!name || name.length > 100 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid name and email address." });
    }
    if (await User.exists({ email, _id: { $ne: user._id } })) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    if (req.body?.role !== "admin" && req.body?.role !== "employee") {
      return res.status(400).json({ message: "Choose a valid user role." });
    }
    if (typeof req.body?.isActive !== "boolean") {
      return res.status(400).json({ message: "Choose a valid account status." });
    }
    if (String(user._id) === String(requester._id) &&
      (req.body.role !== "admin" || req.body.isActive === false)) {
      return res.status(400).json({ message: "You cannot remove your own administrator access or deactivate your account." });
    }

    user.name = name;
    user.email = email;
    user.role = req.body.role === "admin" ? "admin" : "user";
    user.isActive = req.body.isActive;
    await user.save();
    return res.status(200).json({
      message: "User updated successfully.",
      data: getManageableUserFields(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteManagedUser = async (req, res) => {
  try {
    const requester = await getAdminRequester(req, res);
    if (!requester) return;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }
    if (String(requester._id) === id) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ message: "User deleted successfully.", data: { _id: user._id } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crytpto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Password Reset",
        text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account. Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\nhttp://${req.headers.host}/reset-password/${token}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`,
      };
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "Error sending email",
      });
    }
    res.status(200).json({
      message: "Password reset email sent",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error occured",
    });ī
  }
};


export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if(!token || !password){
    return res.status(400).json({
      message: "Token and password are required",
    });
  }
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  try {
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error occurred",
    });
  }
}
