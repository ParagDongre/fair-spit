import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { extractReceiptAndAssignments } from './server/gemini';
import { calculateFairSplit } from './server/fairness-engine';
import { FairSplitRequest, FairSplitResponse } from './src/types';

export function createExpressApp() {
  const app = express();

  // JSON payload parser with generous limit for base64 images
  app.use(express.json({ limit: '25mb' }));

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * Main Fair Split API Endpoint
   * Contract:
   * POST /api/split
   * Request Body: { receipt_base64: string, description: string }
   * Response: FairSplitResponse
   */
  app.post('/api/split', async (req, res) => {
    try {
      const body: FairSplitRequest = req.body;

      if (!body || typeof body.receipt_base64 !== 'string' || !body.receipt_base64.trim()) {
        return res.status(400).json({
          error: 'Missing or empty receipt_base64 in request body.',
          example: {
            receipt_base64: '<raw base64-encoded image string>',
            description: 'Three of us — Ravi, Neha, Sameer. Ravi had the cappuccino...',
          },
        });
      }

      if (typeof body.description !== 'string' || !body.description.trim()) {
        return res.status(400).json({
          error: 'Missing or empty description in request body.',
          example: {
            receipt_base64: '<raw base64-encoded image string>',
            description: 'Three of us — Ravi, Neha, Sameer. Ravi had the cappuccino...',
          },
        });
      }

      // Validate base64 payload size (< 20MB)
      const base64Str = body.receipt_base64.trim();
      if (base64Str.length > 25 * 1024 * 1024) {
        return res.status(413).json({
          error: 'Receipt payload too large. Maximum supported size is 20MB.',
        });
      }

      const description = body.description.trim();

      // Step 1: Multimodal LLM Extraction
      const extractedData = await extractReceiptAndAssignments(base64Str, description);

      // Step 2: Deterministic Arithmetic Calculation & Reconciliation
      const fairSplitResult: FairSplitResponse = calculateFairSplit(extractedData);

      return res.status(200).json(fairSplitResult);
    } catch (err: any) {
      console.error('Error processing fair split:', err);
      const errorMessage = err?.message || 'Failed to process receipt split.';
      return res.status(500).json({
        error: errorMessage,
        flags: [
          err?.message ? `Backend error: ${err.message}` : 'An error occurred during receipt processing or calculation.',
        ],
      });
    }
  });

  return app;
}

async function startServer() {
  const app = createExpressApp();
  const PORT = 3000;

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fair Split Server running on:`);
    console.log(`  ➜ Local:   http://localhost:${PORT}`);
    console.log(`  ➜ Network: http://127.0.0.1:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
