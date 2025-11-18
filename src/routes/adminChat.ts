// src/routes/adminChat.ts

import { Router } from "express";
import { RAGService } from "../services/rag.service";
import { TopicService } from "../services/topic.service";

const router = Router();
const rag = new RAGService();
const topics = new TopicService();

router.post("/ask", async (req, res) => {
  try {
    const { question, userId } = req.body;

    if (!question) {
      return res.json({ ok: false, error: "Question required" });
    }

    const topic = topics.detectTopic(question);
    const result = await rag.generateResponse(userId || "admin", question, topic);

    return res.json({
      ok: true,
      answer: result.answer,
      confidence: result.confidence,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("ROUTE CHAT ERR:", msg);
    res.json({ ok: false, error: msg });
  }
});

export default router;
