
import { Router } from "express";
import { KnowledgeModel } from "../models/knowledge.model";

export const router = Router();

// Dashboard
router.get("/", async (req, res) => {
  const docs = await KnowledgeModel.find().lean();
  res.render("admin/index", { docs });
});

// New KB form
router.get("/new", (req, res) => {
  res.render("admin/new");
});

// Create KB
router.post("/new", async (req, res) => {
  await KnowledgeModel.create(req.body);
  res.redirect("/admin-ui");
});

// Edit KB form
router.get("/edit/:id", async (req, res) => {
  const doc = await KnowledgeModel.findById(req.params.id).lean();
  res.render("admin/edit", { doc });
});

// Update KB
router.post("/edit/:id", async (req, res) => {
  await KnowledgeModel.findByIdAndUpdate(req.params.id, req.body);
  res.redirect("/admin-ui");
});

// Delete
router.get("/delete/:id", async (req, res) => {
  await KnowledgeModel.findByIdAndDelete(req.params.id);
  res.redirect("/admin-ui");
});
