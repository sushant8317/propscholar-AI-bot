// src/controllers/admin-ui.controller.ts
import express from "express";
import KnowledgeModel from "../models/knowledge.model";

export const router = express.Router();

// ---------------------------
// ADMIN UI MAIN PAGE
// ---------------------------
router.get("/", async (req, res) => {
  try {
    const docs = await KnowledgeModel.find().lean();

    // UNIQUE CATEGORIES
    const categories = [...new Set(docs.map((d) => d.category || "Uncategorized"))];

    res.render("admin/index", {
      docs,
      categories,
      total: docs.length
    });

  } catch (err) {
    console.error("🔥 admin-ui error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ---------------------------
// MASS DELETE API
// ---------------------------
router.post("/delete-multiple", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid IDs" });
    }

    await KnowledgeModel.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("🔥 Delete Multiple Error:", err);
    res.status(500).json({ error: "Server Failed" });
  }
});
