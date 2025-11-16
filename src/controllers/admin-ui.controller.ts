import { Router } from "express";
import { KnowledgeModel } from "../models/knowledge.model";
import { EmbedText } from "../services/embedding.service";

export const router = Router();

/* ------------------------------
   DASHBOARD
------------------------------ */
router.get("/", async (req, res) => {
  try {
    const docs = await KnowledgeModel.find().lean();
    res.render("admin/index", { docs });
  } catch (err) {
    console.error("Admin UI load error:", err);
    res.status(500).send("Internal Server Error");
  }
});

/* ------------------------------
   ADD NEW KB FORM
------------------------------ */
router.get("/new", (req, res) => {
  res.render("admin/new");
});

/* ------------------------------
   CREATE KB
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
   EDIT FORM
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
   UPDATE KB
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
   DELETE SINGLE KB
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
   BOT STATUS
------------------------------ */
router.get("/bot-status", async (req, res) => {
  res.json({ isOnline: true });
});
