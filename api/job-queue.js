/**
 * Dendron Job Queue - Handles async processing for long-running LLM calls
 * Solves Vercel 60s free tier timeout by:
 * 1. Returning job ID immediately to client
 * 2. Processing Gemini call in background
 * 3. Client polls /api/jobs/:id for results
 * 4. Results cached for 5 minutes
 */

// In-memory cache (in production, use Redis)
const jobCache = new Map();

function generateJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function cacheJob(id, data, ttl = 300000) {
  // Store with TTL (5 minutes default)
  jobCache.set(id, {
    ...data,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttl,
  });
  
  // Auto-cleanup after TTL
  setTimeout(() => jobCache.delete(id), ttl);
}

function getJob(id) {
  const job = jobCache.get(id);
  if (!job) return null;
  
  // Check if expired
  if (Date.now() > job.expiresAt) {
    jobCache.delete(id);
    return null;
  }
  
  return job;
}

async function processLLMCallAsync(jobId, provider, model, apiKey, prompt) {
  try {
    const PROVIDER_CONFIGS = {
      gemini: {
        url: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        headers: (key) => ({ 'x-goog-api-key': key, 'Content-Type': 'application/json' }),
        body: (model, prompt) => JSON.stringify({
          contents: [{ parts: [{ text: prompt + '\nRespond with JSON.' }] }],
        }),
        parse: (data) => JSON.parse(data.candidates[0].content.parts[0].text),
      },
    };

    const config = PROVIDER_CONFIGS[provider];
    if (!config) throw new Error(`Unknown provider: ${provider}`);

    // Start processing
    cacheJob(jobId, {
      status: 'processing',
      progress: 'Calling Gemini API...',
      result: null,
    });

    const apiUrl = config.url(model);
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: config.headers(apiKey),
      body: config.body(model, prompt),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`API error ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    const result = config.parse(data);

    // Cache completed result
    cacheJob(jobId, {
      status: 'completed',
      result,
      progress: 'Done!',
    });
  } catch (err) {
    cacheJob(jobId, {
      status: 'error',
      error: err.message,
      progress: `Error: ${err.message}`,
    });
  }
}

export { generateJobId, cacheJob, getJob, processLLMCallAsync };
