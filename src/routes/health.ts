import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

healthRouter.get('/ready', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) throw new Error('Database not connected');
    await mongoose.connection.db!.admin().ping();
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'disconnected' });
  }
});
