import { Router } from "express";
import { KnowledgeModel } from "../models/knowledge.model";

export const router = Router();

// API: Get all KB entries
router.get("/kb", async (req, res) => {
  const docs = await KnowledgeModel.find().lean();
  res.json({ ok: true, docs });
});

// API: Bot status check
router.get("/bot-status", (req, res) => {
  res.json({ isOnline: true });
});

// API: Refresh embeddings (placeholder)
router.post("/refresh-embeddings", async (req, res) => {
  return res.json({ message: "Embeddings refreshed (placeholder)" });
});
