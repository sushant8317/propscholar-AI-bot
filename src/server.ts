// src/server.ts

import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import basicAuth from "express-basic-auth";

import adminApiRouter from "./controllers/admin.controller";
import adminUIRouter from "./controllers/admin-ui.controller";

dotenv.config();

const app = express();

// =====================
// Middleware
// =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// View Engine
// =====================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// =====================
// Mongo DB
// =====================
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("MongoDB Connected"))
  .catch((e) => console.error("MongoDB Error:", e));

// =====================
// Admin Panel Login Middleware
// =====================
app.use(
  "/admin-panel",
  basicAuth({
    users: { admin: process.env.ADMIN_PASSWORD || "propscholar" },
    challenge: true,
  })
);

// =====================
// ROUTES
// =====================

// Admin UI
app.use("/admin-panel", adminUIRouter);

// Admin API
app.use("/admin", adminApiRouter);

// Root
app.get("/", (_, res) => {
  res.send("PropScholar AI Bot — Server Running");
});

// =====================
// START
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
