/**
 * Dendron Proxy — Vercel Serverless Function
 *
 * Deploy this repo to Vercel. Set environment variables in the dashboard:
 *   DENDRON_PROVIDER  — openai | anthropic | gemini | groq | mistral | ollama
 *   DENDRON_MODEL     — e.g. gpt-5.4, claude-sonnet-4-6, gemini-3.1-flash-preview
 *   DENDRON_API_KEY   — your provider's API key
 *   ALLOWED_ORIGINS   — comma-separated origins (optional, defaults to *)
 *   OLLAMA_HOST       — only needed for ollama
 *   
 *   FOR DEMO MODE (Multiple Gemini Keys):
 *   GEMINI_API_KEY    — primary Gemini API key
 *   GEMINI_API_KEY_1 to GEMINI_API_KEY_5  — fallback keys
 *   DENDRON_PROVIDER  — set to "gemini"
 *   DENDRON_MODEL     — set to "gemini-3.1-flash-preview"
 */

const PROVIDER_CONFIGS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: (model, prompt) => JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt + '\nRespond with JSON.' }],
      response_format: { type: 'json_object' },
    }),
    parse: (data) => JSON.parse(data.choices[0].message.content),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }),
    body: (model, prompt) => JSON.stringify({
      model,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt + '\nRespond with JSON.' }],
    }),
    parse: (data) => JSON.parse(data.content[0].text),
  },
  gemini: {
    url: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    headers: (key) => ({ 'x-goog-api-key': key, 'Content-Type': 'application/json' }),
    body: (model, prompt) => JSON.stringify({
      contents: [{ parts: [{ text: prompt + '\nRespond with JSON.' }] }],
    }),
    parse: (data) => JSON.parse(data.candidates[0].content.parts[0].text),
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: (model, prompt) => JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
    parse: (data) => JSON.parse(data.choices[0].message.content),
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: (model, prompt) => JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt + '\nRespond with JSON.' }],
    }),
    parse: (data) => JSON.parse(data.choices[0].message.content),
  },
  ollama: {
    url: (_, host) => `${host || 'http://localhost:11434'}/api/chat`,
    headers: () => ({ 'Content-Type': 'application/json' }),
    body: (model, prompt) => JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt + '\nRespond with JSON.' }],
      stream: false,
      format: 'json',
    }),
    parse: (data) => JSON.parse(data.message.content),
  },
};

// Get all available API keys for demo mode
function getAllGeminiKeys() {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
  ].filter(Boolean);
  return keys;
}

// Get random API key from available demo keys
function getRandomGeminiKey() {
  const keys = getAllGeminiKeys();
  if (keys.length === 0) {
    return process.env.DENDRON_API_KEY || '';
  }
  return keys[Math.floor(Math.random() * keys.length)];
}

// Job queue system for async processing (solves 60s timeout)
const jobCache = new Map();

function generateJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function cacheJob(id, data) {
  jobCache.set(id, {
    ...data,
    createdAt: Date.now(),
    expiresAt: Date.now() + 300000, // 5 min TTL
  });
  setTimeout(() => jobCache.delete(id), 300000);
}

function getJob(id) {
  const job = jobCache.get(id);
  if (!job || Date.now() > job.expiresAt) {
    jobCache.delete(id);
    return null;
  }
  return job;
}

async function processInBackground(jobId, provider, model, apiKey, prompt) {
  try {
    cacheJob(jobId, { status: 'processing', progress: 'Calling Gemini API...' });
    const config = PROVIDER_CONFIGS[provider];
    const apiUrl = typeof config.url === 'function' ? config.url(model, process.env.OLLAMA_HOST) : config.url;
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: config.headers(apiKey),
      body: config.body(model, prompt),
    });
    if (!resp.ok) throw new Error(`API error ${resp.status}`);
    const data = await resp.json();
    cacheJob(jobId, { status: 'completed', result: config.parse(data) });
  } catch (err) {
    cacheJob(jobId, { status: 'error', error: err.message });
  }
}

export default async function handler(req, res) {
  const allowed = process.env.ALLOWED_ORIGINS || '*';
  const origin = req.headers.origin || '';
  const allow = allowed === '*' ? '*' : (allowed.split(',').map(o => o.trim()).includes(origin) ? origin : '');

  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const provider = (process.env.DENDRON_PROVIDER || 'openai').toLowerCase();
    const model = process.env.DENDRON_MODEL || 'gpt-5.4-mini';
    const asyncMode = req.body.async === true || req.body.returnJobId === true; // Client can request async
    let apiKey = process.env.DENDRON_API_KEY || '';
    
    if (provider === 'gemini' && getAllGeminiKeys().length > 0) {
      apiKey = getRandomGeminiKey();
    }
    
    const config = PROVIDER_CONFIGS[provider];
    if (!config) return res.status(400).json({ error: `Unknown provider: ${provider}` });

    const prompt = req.body.prompt || JSON.stringify(req.body);

    // ASYNC MODE: Return job ID immediately, process in background
    if (asyncMode) {
      const jobId = generateJobId();
      cacheJob(jobId, { status: 'queued' });
      
      // Process in background (don't await)
      processInBackground(jobId, provider, model, apiKey, prompt);
      
      return res.status(202).json({
        jobId,
        statusUrl: `/api/jobs/${jobId}`,
        message: 'Processing started. Poll statusUrl for results.',
      });
    }

    // SYNC MODE: Process and return immediately (original behavior)
    const apiUrl = typeof config.url === 'function' ? config.url(model, process.env.OLLAMA_HOST) : config.url;
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: config.headers(apiKey),
      body: config.body(model, prompt),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(502).json({ error: `Provider returned ${resp.status}`, detail: errText });
    }

    const data = await resp.json();
    res.json(config.parse(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
