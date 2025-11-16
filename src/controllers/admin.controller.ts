import express from "express";
import { KnowledgeModel } from "../models/knowledge.model";

export const router = express.Router();

// LIST
router.get("/", async (req, res) => {
  const docs = await KnowledgeModel.find();
  res.render("admin/index", { docs });
});

// NEW
router.get("/new", (req, res) => {
  res.render("admin/new");
});

router.post("/new", async (req, res) => {
  await KnowledgeModel.create(req.body);
  res.redirect("/admin-ui");
});

// EDIT
router.get("/edit/:id", async (req, res) => {
  const doc = await KnowledgeModel.findById(req.params.id);
  res.render("admin/edit", { doc });
});

router.post("/edit/:id", async (req, res) => {
  await KnowledgeModel.findByIdAndUpdate(req.params.id, req.body);
  res.redirect("/admin-ui");
});

// DELETE single
router.get("/delete/:id", async (req, res) => {
  await KnowledgeModel.findByIdAndDelete(req.params.id);
  res.redirect("/admin-ui");
});

// DELETE multiple
router.post("/delete-multiple", async (req, res) => {
  await KnowledgeModel.deleteMany({ _id: { $in: req.body.ids } });
  res.json({ success: true });
});

router.post("/delete-multiple", async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: "Invalid IDs" });
  }

  await KnowledgeModel.deleteMany({ _id: { $in: ids } });

  res.json({ message: "Deleted successfully" });
});
