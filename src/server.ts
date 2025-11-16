// src/server.ts
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import basicAuth from "express-basic-auth";
import bodyParser from "body-parser";

import * as adminRouter from "./controllers/admin.controller";
import * as adminUIRouter from "./controllers/admin-ui.controller";

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// AUTH
app.use(
  basicAuth({
    users: { admin: process.env.ADMIN_API_KEY || "propscholar2069" },
    challenge: true,
  })
);

// ROUTES (IMPORTANT: .router)
app.use("/admin", adminRouter.router);
app.use("/admin-ui", adminUIRouter.router);

// MONGODB
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Mongo Error:", err));

// DEFAULT ROUTE
app.get("/", (req, res) => {
  res.send("PropScholar Server Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
