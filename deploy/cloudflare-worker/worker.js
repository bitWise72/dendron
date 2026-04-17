/**
 * Dendron Proxy — Cloudflare Worker
 *
 * Receives behavioral-intelligence payloads from dendron-sdk on the frontend
 * and forwards them to your chosen LLM provider. Deploy once, paste the URL
 * into your <script> tag, done.
 *
 * Environment variables (set via `wrangler secret put`):
 *   DENDRON_PROVIDER  — openai | anthropic | gemini | groq | mistral | ollama
 *   DENDRON_MODEL     — e.g. gpt-5.4, claude-sonnet-4-6, gemini-2.5-pro
 *   DENDRON_API_KEY   — your provider's API key
 *   ALLOWED_ORIGINS   — comma-separated origins (optional, defaults to *)
 *   OLLAMA_HOST       — only needed for ollama (e.g. https://ollama.yourserver.com)
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

function corsHeaders(request, env) {
  const allowed = env.ALLOWED_ORIGINS || '*';
  const origin = request.headers.get('Origin') || '';
  const allow = allowed === '*' ? '*' : (allowed.split(',').map(o => o.trim()).includes(origin) ? origin : '');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), {
        status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Health check
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', provider: env.DENDRON_PROVIDER, model: env.DENDRON_MODEL }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    try {
      const provider = (env.DENDRON_PROVIDER || 'openai').toLowerCase();
      const model = env.DENDRON_MODEL || 'gpt-5.4-mini';
      const apiKey = env.DENDRON_API_KEY || '';
      const config = PROVIDER_CONFIGS[provider];

      if (!config) {
        return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const payload = await request.json();
      const prompt = payload.prompt || JSON.stringify(payload);

      const apiUrl = typeof config.url === 'function' ? config.url(model, env.OLLAMA_HOST) : config.url;
      const apiHeaders = config.headers(apiKey);
      const apiBody = config.body(model, prompt);

      const resp = await fetch(apiUrl, { method: 'POST', headers: apiHeaders, body: apiBody });

      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(JSON.stringify({ error: `Provider returned ${resp.status}`, detail: errText }), {
          status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const data = await resp.json();
      const result = config.parse(data);

      return new Response(JSON.stringify(result), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};
