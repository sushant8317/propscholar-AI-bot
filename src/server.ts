import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import basicAuth from "express-basic-auth";

import adminRouter from "./controllers/admin.controller";
import adminUIRouter from "./controllers/admin-ui.controller";

dotenv.config();

const app = express();

// JSON + Form Support
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ADMIN LOGIN
app.use(
  "/admin-panel",
  basicAuth({
    users: { admin: process.env.ADMIN_PASSWORD || "propscholar" },
    challenge: true
  })
);

// ADMIN UI ROUTES
app.use("/admin-panel", adminUIRouter);

// ADMIN API ROUTES
app.use("/admin", adminRouter);

// HEALTH CHECK
app.get("/", (req, res) => {
  res.send("OK - PropScholar AI Bot Online");
});

// CONNECT DB
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

// START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Server running at http://localhost:${PORT}`);
});
