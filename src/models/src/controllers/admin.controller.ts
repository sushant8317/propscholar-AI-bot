// src/controllers/admin.controller.ts
import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DynamicIngestService from '../services/dynamic-ingest.service';
import { KbEntry } from '../models/kbEntry.model';

dotenv.config();

const router = express.Router();
router.use(bodyParser.json());
router.use(helmet());

// middleware: simple token auth
function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = req.headers['x-admin-key'] || req.query.key || req.headers['authorization'];
  if (!key || String(key) !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Add KB entry
router.post('/kb', requireApiKey, async (req, res) => {
  try {
    const { title, url, category, content, sourceId } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });

    const doc = new KbEntry({ title, url, category, content, sourceId });
    await doc.save();
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'save failed' });
  }
});

// list KB
router.get('/kb', requireApiKey, async (_req, res) => {
  const docs = await KbEntry.find().sort({ createdAt: -1 }).limit(500).lean().exec();
  res.json({ ok: true, count: docs.length, docs });
});

// manual trigger ingest
router.post('/ingest/trigger', requireApiKey, async (_req, res) => {
  const svc = new DynamicIngestService();
  svc.trigger()
    .then(() => res.json({ ok: true }))
    .catch(err => res.status(500).json({ ok: false, error: String(err) }));
});

export default router;
