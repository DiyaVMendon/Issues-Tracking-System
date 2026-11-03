import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      message: "Access denied. No token provided."
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(400).json({
      message: "Invalid token."
    });
  }

  try {
    const user = await User.findById(decoded.id).select("isActive");
    if (!user || user.isActive === false) {
      return res.status(401).json({ message: "This account is unavailable." });
    }
    req.user = decoded;
    return next();
  } catch (error) {
    return next(error);
  }
};