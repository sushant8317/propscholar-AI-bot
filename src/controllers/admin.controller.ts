// src/controllers/admin.controller.ts
import express from "express";
import { MemoryModel } from "../models/memory.model";
import { ProfileModel } from "../models/profile.model";

export const router = express.Router();

// GET /admin/profiles
router.get("/profiles", async (req, res) => {
  try {
    const profiles = await ProfileModel.find().lean();
    res.json({ ok: true, profiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// GET /admin/profile/:userId
router.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await ProfileModel.findOne({ userId }).lean();
    const memories = await MemoryModel.find({ userId }).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ ok: true, profile, memories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// POST /admin/flag (manual)
router.post("/flag", async (req, res) => {
  try {
    const { userId, reason, details } = req.body;
    const doc = new MemoryModel({ userId, text: `ADMIN_FLAG: ${reason}`, summary: reason, score: 1 });
    await doc.save();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});
