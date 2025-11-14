// src/controllers/admin-ui.controller.ts

import express from "express";
import { KbEntry } from "../models/kbEntry.model";

const router = express.Router();

// Dashboard list
router.get("/", async (req, res) => {
  const docs = await KbEntry.find().lean();
  res.render("admin/index", { docs });
});

// New KB form
router.get("/new", (req, res) => {
  res.render("admin/new");
});

// Create KB entry
router.post("/new", async (req, res) => {
  const { title, content, category, url } = req.body;

  await KbEntry.create({
    title,
    content,
    category,
    url
  });

  res.redirect("/admin-panel");
});

// Edit page
router.get("/edit/:id", async (req, res) => {
  const item = await KbEntry.findById(req.params.id).lean();
  res.render("admin/edit", { item });
});

// Update
router.post("/edit/:id", async (req, res) => {
  await KbEntry.findByIdAndUpdate(req.params.id, req.body);
  res.redirect("/admin-panel");
});

// Delete
router.get("/delete/:id", async (req, res) => {
  await KbEntry.findByIdAndDelete(req.params.id);
  res.redirect("/admin-panel");
});

export default router;
