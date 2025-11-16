// src/controllers/admin-ui.controller.ts

import { Router } from "express";
import KnowledgeModel from "../models/knowledge.model";

export const router = Router();

// Dashboard
router.get("/", async (req, res) => {
  try {
    const docs = await KnowledgeModel.find().sort({ createdAt: -1 });
    res.render("admin/index", { docs });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// NEW KB FORM
router.get("/new", (req, res) => {
  res.render("admin/new");
});

// CREATE NEW KB
router.post("/new", async (req, res) => {
  try {
    await KnowledgeModel.create(req.body);
    res.redirect("/admin-ui");
  } catch (err) {
    console.error("Create KB Error:", err);
    res.status(500).send("Failed to create KB");
  }
});

// EDIT FORM
router.get("/edit/:id", async (req, res) => {
  try {
    const doc = await KnowledgeModel.findById(req.params.id);
    if (!doc) return res.status(404).send("KB not found");
    res.render("admin/edit", { doc });
  } catch (err) {
    console.error("Edit Page Error:", err);
    res.status(500).send("Failed to load edit page");
  }
});

// UPDATE KB
router.post("/edit/:id", async (req, res) => {
  try {
    await KnowledgeModel.findByIdAndUpdate(req.params.id, req.body);
    res.redirect("/admin-ui");
  } catch (err) {
    console.error("Update KB Error:", err);
    res.status(500).send("Failed to update KB");
  }
});

// DELETE KB
router.get("/delete/:id", async (req, res) => {
  try {
    await KnowledgeModel.findByIdAndDelete(req.params.id);
    res.redirect("/admin-ui");
  } catch (err) {
    console.error("Delete KB Error:", err);
    res.status(500).send("Failed to delete KB");
  }
});
