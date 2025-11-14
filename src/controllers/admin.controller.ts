// src/controllers/admin.controller.ts

import express, { Request, Response } from "express";
import { KbEntry } from "../models/kbEntry.model";

const router = express.Router();

// ===========================
// GET all KB entries
// ===========================
router.get("/kb", async (req: Request, res: Response) => {
  const docs = await KbEntry.find().lean();
  res.json({ ok: true, count: docs.length, docs });
});

// ===========================
// CREATE KB entry
// ===========================
router.post("/kb", async (req: Request, res: Response) => {
  try {
    const { title, content, category, url } = req.body;

    const entry = await KbEntry.create({
      title,
      content,
      category,
      url
    });

    res.json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ ok: false, error: err });
  }
});

// ===========================
// DELETE KB entry
// ===========================
router.delete("/kb/:id", async (req: Request, res: Response) => {
  try {
    await KbEntry.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err });
  }
});

// ===========================
// UPDATE KB entry
// ===========================
router.put("/kb/:id", async (req: Request, res: Response) => {
  try {
    const updated = await KbEntry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ ok: true, updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err });
  }
});

export default router;
