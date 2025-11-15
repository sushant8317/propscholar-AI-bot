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

      // ===========================
// REFRESH embeddings
// ===========================
router.post("/refresh-embeddings", async (req: Request, res: Response) => {
  try {
    // Get all KB entries
    const docs = await KbEntry.find();
    
    // Re-generate embeddings for all entries
    // Note: This assumes embeddings are auto-generated on save
    // If you have a specific embedding generation function, call it here
    let updatedCount = 0;
    for (const doc of docs) {
      await doc.save(); // This will trigger the pre-save hook to regenerate embeddings
      updatedCount++;
    }
    
    res.json({ 
      ok: true, 
      message: `Successfully refreshed embeddings for ${updatedCount} entries`,
      count: updatedCount 
    });
  } catch (err) {
    res.status(500).json({ 
      ok: false, 
      error: err,
      message: "Failed to refresh embeddings" 
    });
  }
});

export default router;
