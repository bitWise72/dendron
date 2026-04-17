/**
 * GET /api/jobs/:id
 * Poll for job status and results
 * Returns 200 with status + result when done
 */

import { getJob } from './job-queue.js';

export default function handler(req, res) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS || '*';
  const origin = req.headers.origin || '';
  const allow =
    allowedOrigins === '*'
      ? '*'
      : allowedOrigins.split(',').map(o => o.trim()).includes(origin)
      ? origin
      : '';

  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const jobId = req.url.split('/').pop();

    if (!jobId || !jobId.startsWith('job_')) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const job = getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found or expired',
        jobId,
      });
    }

    // Return current job status
    const response = {
      jobId,
      status: job.status, // 'processing' | 'completed' | 'error'
      progress: job.progress,
      result: job.result || null,
      error: job.error || null,
    };

    // Return appropriate status code
    const statusCode =
      job.status === 'completed'
        ? 200
        : job.status === 'error'
        ? 500
        : 202; // 202 = Accepted (still processing)

    res.status(statusCode).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
