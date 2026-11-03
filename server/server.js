import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// import path from "path"
import {connectdb} from "./config/db.js"
import AuthRoutes from "./routes/AuthRoutes.js"
import IssueRoutes from "./routes/IssueRoutes.js"


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use("/uploads", express.static(path.resolve("uploads")));

app.get("/",(req,res)=>{
    console.log("API is running")
    res.send("API is running")

})


app.use(async (req, res, next) => {
  try {
    await connectdb();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

app.use("/api/auth",AuthRoutes)
app.use("/api/issues",IssueRoutes);
export default app;
