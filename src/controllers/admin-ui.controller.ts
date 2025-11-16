import express, { Request, Response } from "express";
import MemoryModel from "../models/memory.model";
import KBEntry from "../models/kbEntry.model";  // your KB schema (rename if needed)

export const router = express.Router();

// ----------------------
// ADMIN UI DASHBOARD
// ----------------------
router.get("/", async (req: Request, res: Response) => {
    try {
        // Fetch all KB docs
        const docs = await KBEntry.find().lean();

        // Categories extracted from docs
        const categories = [...new Set(docs.map(d => d.category || "General"))];

        res.render("admin/index", {
            docs,
            categories,
            botStatus: true  // placeholder
        });

    } catch (err) {
        console.error("Dashboard render error:", err);
        res.status(500).send("Dashboard crashed.");
    }
});

// OPTIONAL: /admin-ui/dashboard → same page
router.get("/dashboard", async (req: Request, res: Response) => {
    try {
        const docs = await KBEntry.find().lean();
        const categories = [...new Set(docs.map(d => d.category || "General"))];

        res.render("admin/index", {
            docs,
            categories,
            botStatus: true
        });
    } catch (err) {
        console.error("Dashboard crashed:", err);
        res.status(500).send("Dashboard crashed.");
    }
});

export default router;
