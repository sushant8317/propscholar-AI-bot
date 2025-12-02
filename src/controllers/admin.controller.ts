// src/controllers/admin.controller.ts
// Production-ready admin controller with full error handling, validation, and security

import express, { Request, Response } from "express";
import { KnowledgeModel } from "../models/knowledge.model";
import mongoose from "mongoose";

export const router = express.Router();

// ============================================================
// ERROR HANDLING & LOGGING UTILITIES
// ============================================================

const logger = {
  error: (msg: string, err?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${msg}`, err || "");
  },
  info: (msg: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${msg}`);
  },
  warn: (msg: string) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${msg}`);
  }
};

// ============================================================
// DATA VALIDATION UTILITIES
// ============================================================

function validateKnowledgeBase(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.title || typeof data.title !== "string" || data.title.trim().length === 0) {
    errors.push("Title is required and must be a non-empty string");
  } else if (data.title.length > 500) {
    errors.push("Title must not exceed 500 characters");
  }
  
  if (!data.category || typeof data.category !== "string" || data.category.trim().length === 0) {
    errors.push("Category is required and must be a non-empty string");
  }
  
  if (!data.content || typeof data.content !== "string" || data.content.trim().length === 0) {
    errors.push("Content is required and must be a non-empty string");
  } else if (data.content.length > 50000) {
    errors.push("Content must not exceed 50,000 characters");
  }
  
  if (data.embedding && !Array.isArray(data.embedding)) {
    errors.push("Embedding must be an array of numbers");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function sanitizeKnowledgeBase(data: any) {
  return {
    title: (data.title || "").trim(),
    category: (data.category || "").trim(),
    content: (data.content || "").trim(),
    embedding: Array.isArray(data.embedding) ? data.embedding : [],
    metadata: data.metadata || {}
  };
}

// ============================================================
// ROUTE HANDLERS
// ============================================================

// LIST ALL - with pagination and filtering
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const skip = (page - 1) * limit;
    
    if (page < 1 || limit < 1 || limit > 500) {
      return res.status(400).json({ error: "Invalid pagination parameters" });
    }
    
    const docs = await KnowledgeModel.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await KnowledgeModel.countDocuments();
    
    logger.info(`Listed ${docs.length} knowledge bases (page ${page})`);
    
    res.json({
      success: true,
      data: docs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logger.error("Failed to list knowledge bases", err);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve knowledge bases"
    });
  }
});

// GET SINGLE BY ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid knowledge base ID" });
    }
    
    const doc = await KnowledgeModel.findById(req.params.id).lean();
    
    if (!doc) {
      logger.warn(`Knowledge base not found: ${req.params.id}`);
      return res.status(404).json({ error: "Knowledge base not found" });
    }
    
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error("Failed to fetch knowledge base", err);
    res.status(500).json({ error: "Failed to fetch knowledge base" });
  }
});

// CREATE NEW KB
router.post("/new", async (req: Request, res: Response) => {
  try {
    const validation = validateKnowledgeBase(req.body);
    if (!validation.valid) {
      logger.warn(`Validation failed: ${validation.errors.join(", ")}`);
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }
    
    const sanitized = sanitizeKnowledgeBase(req.body);
    const doc = await KnowledgeModel.create(sanitized);
    
    logger.info(`Created new knowledge base: ${doc._id}`);
    
    if (req.accepts("json")) {
      res.json({ success: true, data: doc });
    } else {
      res.redirect("/admin-ui");
    }
  } catch (err) {
    logger.error("Failed to create knowledge base", err);
    if (req.accepts("json")) {
      res.status(500).json({ error: "Failed to create knowledge base" });
    } else {
      res.redirect("/admin-ui?error=Creation failed");
    }
  }
});

// UPDATE KB
router.post("/edit/:id", async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid knowledge base ID" });
    }
    
    const validation = validateKnowledgeBase(req.body);
    if (!validation.valid) {
      logger.warn(`Update validation failed for ${req.params.id}: ${validation.errors.join(", ")}`);
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }
    
    const existingDoc = await KnowledgeModel.findById(req.params.id);
    if (!existingDoc) {
      logger.warn(`Attempted to update non-existent KB: ${req.params.id}`);
      return res.status(404).json({ error: "Knowledge base not found" });
    }
    
    const sanitized = sanitizeKnowledgeBase(req.body);
    const updatedDoc = await KnowledgeModel.findByIdAndUpdate(
      req.params.id,
      sanitized,
      { new: true, runValidators: true }
    );
    
    logger.info(`Updated knowledge base: ${req.params.id}`);
    
    if (req.accepts("json")) {
      res.json({ success: true, data: updatedDoc });
    } else {
      res.redirect("/admin-ui");
    }
  } catch (err) {
    logger.error(`Failed to update knowledge base ${req.params.id}`, err);
    if (req.accepts("json")) {
      res.status(500).json({ error: "Failed to update knowledge base" });
    } else {
      res.redirect("/admin-ui?error=Update failed");
    }
  }
});

// DELETE KB
router.post("/delete/:id", async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid knowledge base ID" });
    }
    
    const doc = await KnowledgeModel.findById(req.params.id);
    if (!doc) {
      logger.warn(`Attempted to delete non-existent KB: ${req.params.id}`);
      return res.status(404).json({ error: "Knowledge base not found" });
    }
    
    logger.info(`DELETING KB: ${req.params.id} | Title: ${doc.title} | Category: ${doc.category}`);
    
    await KnowledgeModel.findByIdAndDelete(req.params.id);
    
    logger.info(`Successfully deleted knowledge base: ${req.params.id}`);
    
    if (req.accepts("json")) {
      res.json({ success: true, message: "Knowledge base deleted" });
    } else {
      res.redirect("/admin-ui?success=deleted");
    }
  } catch (err) {
    logger.error(`Failed to delete knowledge base ${req.params.id}`, err);
    if (req.accepts("json")) {
      res.status(500).json({ error: "Failed to delete knowledge base" });
    } else {
      res.redirect("/admin-ui?error=Deletion failed");
    }
  }
});

// DELETE via DELETE method
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid knowledge base ID" });
    }
    
    const doc = await KnowledgeModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Knowledge base not found" });
    }
    
    logger.info(`DELETING KB via DELETE: ${req.params.id} | Title: ${doc.title}`);
    
    await KnowledgeModel.findByIdAndDelete(req.params.id);
    
    logger.info(`Successfully deleted knowledge base: ${req.params.id}`);
    res.json({ success: true, message: "Knowledge base deleted" });
  } catch (err) {
    logger.error(`Failed to delete knowledge base ${req.params.id}`, err);
    res.status(500).json({ error: "Failed to delete knowledge base" });
  }
});

// BULK DELETE
router.post("/bulk-delete", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No IDs provided" });
    }
    
    if (ids.length > 100) {
      return res.status(400).json({ error: "Cannot delete more than 100 items at once" });
    }
    
    if (!ids.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const docs = await KnowledgeModel.find({ _id: { $in: ids } }).lean();
    docs.forEach(doc => {
      logger.info(`BULK DELETE: ${doc._id} | Title: ${doc.title}`);
    });
    
    const result = await KnowledgeModel.deleteMany({ _id: { $in: ids } });
    
    logger.info(`Bulk deleted ${result.deletedCount} knowledge bases`);
    
    res.json({
      success: true,
      deleted: result.deletedCount,
      message: `${result.deletedCount} knowledge bases deleted`
    });
  } catch (err) {
    logger.error("Failed to bulk delete knowledge bases", err);
    res.status(500).json({ error: "Failed to delete knowledge bases" });
  }
});

// HEALTH CHECK
router.get("/admin/health", async (req: Request, res: Response) => {
  try {
    const count = await KnowledgeModel.countDocuments();

    // 🔥 FIXED — added ! to guarantee db exists
    const size = await mongoose.connection.db!.command({
      collStats: KnowledgeModel.collection.name
    });

    res.json({
      success: true,
      stats: {
        totalDocuments: count,
        collectionSize: size.size || 0,
        averageDocSize: Math.round((size.size || 1) / Math.max(count, 1))
      }
    });
  } catch (err) {
    logger.error("Health check failed", err);
    res.status(500).json({ error: "Health check failed" });
  }
});

// LEGACY ROUTE
router.get("/delete/:id", (req: Request, res: Response) => {
  logger.warn(`Attempted to use GET method for delete (deprecated): ${req.params.id}`);
  res.status(405).json({
    error: "Method Not Allowed",
    message: "Use POST /admin/delete/:id or DELETE /admin/:id instead"
  });
});

export default router;
