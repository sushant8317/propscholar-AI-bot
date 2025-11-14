import { Router } from "express";
import { KbEntry } from "../models/kbEntry.model";
import DynamicIngestService from "../services/dynamic-ingest.service";

const router = Router();

// ----------------------------------------------------
// POST KB ENTRY
// ----------------------------------------------------
router.post("/kb", async (req, res) => {
  try {
    if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const entry = new KbEntry(req.body);
    await entry.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("KB Save Error:", err);
    return res.status(500).json({ error: "Failed to save KB entry" });
  }
});

// ----------------------------------------------------
// GET KB ENTRIES
// ----------------------------------------------------
router.get("/kb", async (req, res) => {
  try {
    if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const docs = await KbEntry.find();
    return res.json({ ok: true, count: docs.length, docs });
  } catch (err) {
    console.error("KB Fetch Error:", err);
    return res.status(500).json({ error: "Failed to fetch KB entries" });
  }
});

// ----------------------------------------------------
// TRIGGER INGEST
// ----------------------------------------------------
router.post("/ingest/trigger", async (req, res) => {
  try {
    if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const svc = new DynamicIngestService();
    svc.trigger();

    return res.json({ ok: true });
  } catch (err) {
    console.error("Ingest Error:", err);
    return res.status(500).json({ error: "Ingest failed" });
  }
});

export default router;
