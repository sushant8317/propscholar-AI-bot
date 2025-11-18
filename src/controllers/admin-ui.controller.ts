import { Router } from "express";
import { KnowledgeModel } from "../models/knowledge.model";
import { EmbedText } from "../services/embedding.service";
import { TrainingFeedbackModel } from "../models/trainingFeedback.model";
import { Conversation } from "../models/conversation.model";
import { RAGService } from "../services/rag.service";
import { randomBytes } from "crypto";

export const router = Router();

/* ------------------------------
   DASHBOARD
------------------------------ */
router.get("/", async (req, res) => {
  try {
    const docs = await KnowledgeModel.find().lean();
    res.render("admin/index", {
      docs,
      total: docs.length,
      categories: [...new Set(docs.map((d) => d.category))],
    });
  } catch (err) {
    console.error("Admin UI load error:", err);
    res.status(500).send("Internal Server Error");
  }
});

/* ------------------------------
   ADD NEW KB
------------------------------ */
router.get("/new", (req, res) => {
  res.render("admin/new");
});

/* ------------------------------
   CREATE
------------------------------ */
router.post("/new", async (req, res) => {
  try {
    const { title, category, content } = req.body;

    const embedding = await EmbedText(content);

    await KnowledgeModel.create({
      title,
      category,
      content,
      embedding,
    });

    res.redirect("/admin-ui");
  } catch (err) {
    console.error("Create KB Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

/* ------------------------------
   EDIT
------------------------------ */
router.get("/edit/:id", async (req, res) => {
  try {
    const doc = await KnowledgeModel.findById(req.params.id).lean();
    res.render("admin/edit", { doc });
  } catch (err) {
    console.error("Edit KB Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

/* ------------------------------
   UPDATE
------------------------------ */
router.post("/edit/:id", async (req, res) => {
  try {
    const { title, category, content } = req.body;

    const embedding = await EmbedText(content);

    await KnowledgeModel.findByIdAndUpdate(req.params.id, {
      title,
      category,
      content,
      embedding,
    });

    res.redirect("/admin-ui");
  } catch (err) {
    console.error("Update KB Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

/* ------------------------------
   DELETE SINGLE
------------------------------ */
router.get("/delete/:id", async (req, res) => {
  try {
    await KnowledgeModel.findByIdAndDelete(req.params.id);
    res.redirect("/admin-ui");
  } catch (err) {
    console.error("Delete KB error:", err);
    res.status(500).send("Internal Server Error");
  }
});

/* ------------------------------
   MULTI DELETE
------------------------------ */
router.post("/delete-multiple", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.json({ success: false, message: "Invalid IDs" });
    }

    await KnowledgeModel.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Multi delete error:", err);
    res.status(500).json({ success: false });
  }
});

/* ------------------------------
   REFRESH EMBEDDINGS
------------------------------ */
router.post("/refresh-embeddings", async (req, res) => {
  try {
    const docs = await KnowledgeModel.find().lean();

    for (const d of docs) {
      const newEmbedding = await EmbedText(d.content);
      await KnowledgeModel.findByIdAndUpdate(d._id, {
        embedding: newEmbedding,
      });
    }

    res.json({ message: "Embeddings refreshed" });
  } catch (err) {
    console.error("Embedding refresh error:", err);
    res.status(500).json({ message: "Failed" });
  }
});

/* ------------------------------
   CHAT PAGE
------------------------------ */
router.get("/chat", (req, res) => {
  res.render("admin/chat");
});

/* ------------------------------
   CHAT MESSAGE SEND
------------------------------ */
router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.json({ success: false, error: "Message required" });
    }

    const conversationId = randomBytes(16).toString("hex");

    const rag = new RAGService();
    const result = await rag.generateResponse(sessionId || "admin", message, "general");

    await Conversation.create({
      userId: sessionId || "admin",
      conversationId,
      userMessage: message,
      botResponse: result.answer,
      timestamp: new Date(),
      confidence: result.confidence || 0,
    });

    res.json({
      success: true,
      answer: result.answer,
      conversationId,
      confidence: result.confidence || 0,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ success: false, error: "Chat failed" });
  }
});

/* ------------------------------
   FEEDBACK
------------------------------ */
router.post("/feedback", async (req, res) => {
  try {
    const { conversationId, isCorrect, correction } = req.body;

    const conv = await Conversation.findOne({ conversationId });

    if (!conv) {
      return res.json({ success: false, error: "Conversation not found" });
    }

    await TrainingFeedbackModel.findOneAndUpdate(
      { conversationId },
      {
        $set: {
          timestamp: new Date(),
          userQuestion: conv.userMessage,
          botAnswer: conv.botResponse,
          wasCorrect: isCorrect,
          userCorrection: correction || null,
          status: "pending",
          appliedToKB: false,
        },
      },
      { upsert: true }
    );

    if (!isCorrect && correction) {
      const embedding = await EmbedText(correction);

      const newKB = await KnowledgeModel.create({
        title: `Q: ${conv.userMessage}`,
        content: `A: ${correction}`,
        category: "Admin Corrections",
        embedding,
      });

      await TrainingFeedbackModel.updateOne(
        { conversationId },
        {
          appliedToKB: true,
          kbEntryId: String(newKB._id),
          status: "applied",
        }
      );

      return res.json({
        success: true,
        message: "Correction added to KB",
        kbEntryId: newKB._id,
      });
    }

    res.json({ success: true, message: "Feedback saved" });
  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).json({ success: false, error: "Failed to save feedback" });
  }
});

export default router;
