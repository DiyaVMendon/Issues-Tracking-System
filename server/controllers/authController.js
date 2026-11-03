import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
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

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
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

    const users = await User.find().select("_id name email role").sort({ name: 1 });
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
