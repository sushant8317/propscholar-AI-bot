// src/controllers/admin-ui.controller.ts
import express, { Request, Response } from "express";
import MemoryModel from "../models/memory.model";

export const router = express.Router();

// Dashboard home
router.get("/", async (_req, res) => {
  res.render("index", { title: "PropScholar Admin" });
});

// List all users memory
router.get("/memory", async (_req, res) => {
  const users = await MemoryModel.find().select("userId updatedAt");
  res.render("memory", { title: "Memory Users", users });
});

// View a specific user's memory
router.get("/memory/:userId", async (req, res) => {
  const userId = req.params.userId;
  const mem = await MemoryModel.findOne({ userId });
  res.render("memory_detail", { title: "User Memory", mem, userId });
});

// Clear memory
router.post("/memory/:userId/delete", async (req, res) => {
  await MemoryModel.deleteOne({ userId: req.params.userId });
  res.redirect("/admin-ui/memory");
});

// Teach manually
router.get("/teach", (req, res) => {
  res.render("teach", { title: "Add Knowledge" });
});

router.post("/teach", async (req, res) => {
  // store in memory as long-term
  await MemoryModel.create({
    userId: "system",
    longTerm: [req.body.text],
  });

  res.redirect("/admin-ui");
});
