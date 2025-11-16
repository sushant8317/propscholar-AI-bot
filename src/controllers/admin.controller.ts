// src/controllers/admin.controller.ts
import express from "express";
import { KnowledgeModel } from "../models/knowledge.model";

export const router = express.Router();

// LIST ALL
router.get("/", async (req, res) => {
  const docs = await KnowledgeModel.find();
  res.json(docs);
});

// NEW KB
router.post("/new", async (req, res) => {
  await KnowledgeModel.create(req.body);
  res.redirect("/admin-ui");
});

// EDIT PAGE
router.get("/edit/:id", async (req, res) => {
  const doc = await KnowledgeModel.findById(req.params.id);
  res.render("admin/edit", { doc });
});

// UPDATE KB
router.post("/edit/:id", async (req, res) => {
  await KnowledgeModel.findByIdAndUpdate(req.params.id, req.body);
  res.redirect("/admin-ui");
});

// DELETE 1
router.get("/delete/:id", async (req, res) => {
  await KnowledgeModel.findByIdAndDelete(req.params.id);
  res.redirect("/admin-ui");
});
