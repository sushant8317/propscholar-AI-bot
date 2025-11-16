// src/controllers/admin.controller.ts
import express, { Request, Response } from "express";
import MemoryModel from "../models/memory.model";


export const router = express.Router();

// GET /admin/memory
router.get("/memory", async (_req: Request, res: Response) => {
  try {
    const entries = await MemoryModel.find().sort({ createdAt: -1 }).limit(200);

    res.json({
      ok: true,
      entries,
    });
  } catch (err: any) {
    console.error("Memory fetch error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /admin/flag  (manual memory writing)
router.post("/flag", async (req: Request, res: Response) => {
  try {
    const { userId, reason, details } = req.body;

    const doc = new MemoryModel({
      userId,
      text: `ADMIN_FLAG: ${reason}`,
      summary: details || "",
      score: 1,
    });

    await doc.save();

    res.json({ ok: true });
  } catch (err: any) {
    console.error("Flag error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
