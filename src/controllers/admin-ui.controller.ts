// src/controllers/admin-ui.controller.ts

import { Router } from "express";
import { KbEntry } from "../models/kbEntry.model";

const router = Router();

// Dashboard
router.get("/", async (req, res) => {
  const items = await KbEntry.find().lean();
  res.render("admin/index", { items });
});

// New
router.get("/new", (req, res) => {
  res.render("admin/new");
});

router.post("/new", async (req, res) => {
  const { title, content, category, url } = req.body;
  await KbEntry.create({ title, content, category, url });
  res.redirect("/admin-panel");
});

// Edit
router.get("/edit/:id", async (req, res) => {
  const item = await KbEntry.findById(req.params.id).lean();
  res.render("admin/edit", { item });
});

router.post("/edit/:id", async (req, res) => {
  const { title, content, category, url } = req.body;
  await KbEntry.findByIdAndUpdate(req.params.id, { title, content, category, url });
  res.redirect("/admin-panel");
});

// Delete
router.get("/delete/:id", async (req, res) => {
  await KbEntry.findByIdAndDelete(req.params.id);
  res.redirect("/admin-panel");
});

export default router;
