// src/controllers/admin-ui.controller.ts
import express from "express";
import { KnowledgeModel } from "../models/knowledge.model";

export const router = express.Router();

// MAIN UI PAGE
router.get("/", async (req, res) => {
  try {
    const docs = await KnowledgeModel.find().lean();

    const categories: string[] = [
      ...new Set(docs.map((d: any) => d.category || "Uncategorized"))
    ];

    res.render("admin/index", {
      docs,
      categories,
      total: docs.length
    });

  } catch (err) {
    console.error("UI Controller Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// DELETE MULTIPLE
router.post("/delete-multiple", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid ids" });
    }

    await KnowledgeModel.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, deleted: ids.length });

  } catch (err) {
    console.error("Delete Multiple Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
