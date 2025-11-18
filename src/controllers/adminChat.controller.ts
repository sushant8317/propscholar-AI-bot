// src/controllers/adminChat.controller.ts

import express from "express";
import { RAGService } from "../services/rag.service";
import { TopicService } from "../services/topic.service";

const router = express.Router();
const rag = new RAGService();
const topics = new TopicService();

router.get("/chat", (req, res) => {
  res.render("admin_chat", { title: "Admin Trainer" });
});

router.post("/api/chat", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.json({ ok: false, error: "Question is required" });
    }

    const topic = topics.detectTopic(question);
    const ragResult = await rag.generateResponse("admin", question, topic);

    return res.json({
      ok: true,
      answer: ragResult.answer,
      confidence: ragResult.confidence,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("ADMIN CHAT ERROR:", msg);
    return res.json({ ok: false, error: msg });
  }
});

export { router };
