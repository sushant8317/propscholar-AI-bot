// src/controllers/adminChat.controller.ts

import express from "express";
import { KnowledgeModel } from "../models/knowledge.model";
import Feedback from "../models/Feedback";

import { EmbedText } from "../services/embedding.service";
import { VectorService } from "../services/vector.service";
import { RAGService } from "../services/rag.service";
import { Types } from "mongoose"; // ⭐ FIX: Import ObjectId

const router = express.Router();

// Services
const vector = new VectorService();
const rag = new RAGService();

/* -----------------------------------------------------------
   1️⃣ Render Admin Trainer UI
------------------------------------------------------------*/
router.get("/chat", (req, res) => {
  res.render("admin_chat", { title: "Admin Trainer" });
});

/* -----------------------------------------------------------
   2️⃣ Admin → Ask Question → Bot Replies (RAG)
------------------------------------------------------------*/
router.post("/api/chat", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.json({ ok: false, error: "Question is required" });
    }

    const ragResult = await rag.generateResponse("admin", question);

    return res.json({
      ok: true,
      answer: ragResult.answer,
      sources: [],
      confidence: ragResult.confidence
    });

  } catch (err: any) {
    console.error("ADMIN CHAT ERROR:", err);
    return res.json({ ok: false, error: err.message });
  }
});

/* -----------------------------------------------------------
   3️⃣ Save Correction → KB + Embed + Vector Upsert
------------------------------------------------------------*/
router.post("/api/feedback", async (req, res) => {
  try {
    const { question, botAnswer, userCorrection, adminUser } = req.body;

    if (!question || !botAnswer || !userCorrection) {
      return res.json({
        ok: false,
        error: "Missing: question, botAnswer or userCorrection"
      });
    }

    // 1) Save Feedback
    const fb = await Feedback.create({
      question,
      botAnswer,
      userCorrection,
      adminUser: adminUser || "admin",
      processed: false
    });

    // 2) Build correction KB entry
    const correctionText = `Q: ${question}\nA: ${userCorrection}\n(source: admin correction)`;

    const newKB = await KnowledgeModel.create({
      title: `Correction: ${question.slice(0, 60)}`,
      category: "admin-correction",
      content: correctionText,
      embedding: []
    });

    // 3) Create embeddings
    const embedding = await EmbedText(correctionText);
    newKB.embedding = embedding;
    await newKB.save();

    // ⭐ FIX: Convert unknown _id → ObjectId
    const objectId = new Types.ObjectId(String(newKB._id));

    // 4) Store in Vector DB
    await vector.upsertEmbedding(
      String(newKB._id),
      correctionText,
      embedding,
      {
        category: "admin-correction",
        source: "admin-feedback",
        question
      }
    );

    // 5) Link FB → KB (ObjectId required)
    fb.kbId = objectId;
    fb.processed = true;
    await fb.save();

    return res.json({
      ok: true,
      message: "Correction saved and KB updated",
      feedback: fb,
      kb: newKB
    });

  } catch (err: any) {
    console.error("ADMIN FEEDBACK ERROR:", err);
    return res.json({ ok: false, error: err.message });
  }
});

export { router };
/* -----------------------------------------------------------
   4️⃣ REVIEW PAGE — list all feedback
------------------------------------------------------------*/
router.get("/review", async (req, res) => {
  try {
    const items = await Feedback.find().sort({ createdAt: -1 }).lean();
    res.render("admin_feedbacks", { title: "Feedback Review", items });
  } catch (err) {
    console.error("REVIEW PAGE ERROR:", err);
    res.status(500).send("Error loading page");
  }
});

/* -----------------------------------------------------------
   5️⃣ APPROVE FEEDBACK
------------------------------------------------------------*/
router.post("/api/feedback/approve", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ ok: false, error: "Missing id" });

    await Feedback.findByIdAndUpdate(id, { status: "approved" });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.json({ ok: false, error: err.message });
  }
});

/* -----------------------------------------------------------
   6️⃣ REJECT FEEDBACK
------------------------------------------------------------*/
router.post("/api/feedback/reject", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ ok: false, error: "Missing id" });

    await Feedback.findByIdAndUpdate(id, { status: "rejected" });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.json({ ok: false, error: err.message });
  }
});

/* -----------------------------------------------------------
   7️⃣ DELETE FEEDBACK
------------------------------------------------------------*/
router.post("/api/feedback/delete", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ ok: false, error: "Missing id" });

    await Feedback.findByIdAndDelete(id);

    return res.json({ ok: true });
  } catch (err: any) {
    return res.json({ ok: false, error: err.message });
  }
});
