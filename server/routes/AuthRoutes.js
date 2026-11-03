import express from "express";
import { Signup,Login } from "../controllers/authController.js";

const route = express.Router();

route.post("/signup",Signup)
route.post("/login",Login)

export default route;