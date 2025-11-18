import express from "express";
import { KnowledgeModel } from "../models/knowledge.model";
import Feedback from "../models/Feedback";
import { EmbedText } from "../services/embedding.service";
import { VectorService } from "../services/vector.service";
import { RAGService } from "../services/rag.service";
import { Types } from "mongoose";

const router = express.Router();

const vector = new VectorService();
const rag = new RAGService();

/* ------------------------------
   ADMIN CHAT UI PAGE
------------------------------ */
router.get("/chat", (req, res) => {
  res.render("admin_chat", { title: "Admin Trainer" });
});

/* ------------------------------
   BOT REPLY (RAG)
------------------------------ */
router.post("/api/chat", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.json({ ok: false, error: "Question is required" });
    }

    const ragResult = await rag.generateResponse("admin", question, "general");

    return res.json({
      ok: true,
      answer: ragResult.answer,
      confidence: ragResult.confidence,
    });
  } catch (err) {
    console.error("ADMIN CHAT ERROR:", err);
    return res.json({ ok: false, error: err.message });
  }
});

/* ------------------------------
   FEEDBACK → KB UPDATE
------------------------------ */
router.post("/api/feedback", async (req, res) => {
  try {
    const { question, botAnswer, userCorrection, adminUser } = req.body;

    if (!question || !botAnswer || !userCorrection) {
      return res.json({
        ok: false,
        error: "Missing fields",
      });
    }

    const fb = await Feedback.create({
      question,
      botAnswer,
      userCorrection,
      adminUser: adminUser || "admin",
      processed: false,
    });

    const correctionText = `Q: ${question}\nA: ${userCorrection}\n(source: admin correction)`;

    const newKB = await KnowledgeModel.create({
      title: `Correction: ${question.slice(0, 60)}`,
      category: "admin-correction",
      content: correctionText,
      embedding: [],
    });

    const embedding = await EmbedText(correctionText);
    newKB.embedding = embedding;
    await newKB.save();

    await vector.upsertEmbedding(
      String(newKB._id),
      correctionText,
      embedding,
      {
        category: "admin-correction",
        source: "admin-feedback",
      }
    );

    fb.kbId = new Types.ObjectId(String(newKB._id));
    fb.processed = true;
    await fb.save();

    return res.json({
      ok: true,
      message: "Correction saved",
      kb: newKB,
      feedback: fb,
    });
  } catch (err) {
    console.error("ADMIN FEEDBACK ERROR:", err);
    return res.json({ ok: false, error: err.message });
  }
});

export { router };
