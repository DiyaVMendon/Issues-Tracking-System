import express from "express";
import {
  Signup,
  Login,
  getAllUsers,
  getUsers,
  getManagedUsers,
  createManagedUser,
  updateManagedUser,
  deleteManagedUser,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import uploads from "../middleware/upload.js";

const route = express.Router();

route.post("/signup",Signup)
route.post("/login",Login)
route.get("/profile", verifyToken, getProfile);
route.put("/profile", verifyToken, uploads.single("avatar"), updateProfile);
route.put("/profile/password", verifyToken, changePassword);
route.get("/users/all", verifyToken, getAllUsers);
route.get("/users/manage", verifyToken, getManagedUsers);
route.post("/users/manage", verifyToken, createManagedUser);
route.put("/users/manage/:id", verifyToken, updateManagedUser);
route.delete("/users/manage/:id", verifyToken, deleteManagedUser);
route.get("/users", verifyToken, getUsers);
route.post("/forgot-password", forgotPassword);
route.post("/reset-password/:token", resetPassword );

export default route;