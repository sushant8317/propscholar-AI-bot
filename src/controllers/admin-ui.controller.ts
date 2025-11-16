// src/controllers/admin-ui.controller.ts
import express, { Request, Response } from "express";
import { MemoryModel } from "../models/memory.model";

export const router = express.Router();

// --------------------
// ADMIN UI DASHBOARD
// --------------------
router.get("/", async (req: Request, res: Response) => {
  try {
    const entries = await MemoryModel.find()
      .sort({ createdAt: -1 })
      .limit(200);

    // 👉 VERY IMPORTANT: point to "admin/index"
    res.render("admin/index", { entries });

  } catch (err) {
    console.error("Admin UI Error:", err);
    res.status(500).send("Dashboard Error");
  }
});

// --------------------
// TEACH PAGE
// --------------------
router.get("/teach", (req: Request, res: Response) => {
  res.render("admin/teach");
});

router.post("/teach", async (req: Request, res: Response) => {
  try {
    await MemoryModel.create({
      userId: "system",
      text: req.body.text,
      summary: "",
      score: 0
    });
    res.redirect("/admin-ui");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving memory");
  }
});
