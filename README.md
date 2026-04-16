# Dendron SDK

**The Zero-Liability Behavioral Intelligence SDK**

Dendron makes any website intelligent about its visitors. It tracks in-session behavioral signals (scroll depth, reading time, cursor patterns, interaction focus), assembles structured intent data, and surfaces AI-generated **Smart Cards** through a chat-style widget overlay.

- **Zero server infrastructure** — runs entirely in the browser
- **BYOK (Bring Your Own Key)** — your backend, your LLM, your keys
- **13KB gzipped** — Web Worker architecture, zero main-thread blocking
- **Shadow DOM isolated** — never leaks CSS into or out of the host page
- **Privacy-first** — no cookies, no central data store, no PII collection

## Quick Start

```bash
npm install @dendron-sdk/core
```

```js
import { Dendron } from '@dendron-sdk/core';

Dendron.init({
  onQuery: async (payload) => {
    const res = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  systemContext: 'Acme is a developer platform for edge deployments.',
});
```

That's it. Dendron handles tracking, intent scoring, prompt building, and card rendering. Your backend handles the LLM call.

## CDN

```html
<script src="https://cdn.dendron.dev/v1/dendron.min.js"
  integrity="sha384-{hash}"
  crossorigin="anonymous"></script>

<script>
  Dendron.init({
    onQuery: async (payload) => {
      const res = await fetch('/api/ai-proxy', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.json();
    }
  });
</script>
```

## How It Works

```
Visitor scrolls/reads/clicks
    ↓  Main thread → Web Worker (postMessage)
Tracker captures behavioral signals
    ↓  Debounced, batched, off main thread
Context Engine scores intent (0-100)
    ↓  When threshold crossed (default: 55)
Prompt Builder assembles LLM-ready payload
    ↓  Passed to YOUR onQuery callback
Card Renderer shows Smart Card in Shadow DOM widget
```

Dendron never makes network requests. The only egress is your `onQuery` callback.

## Smart Card Types

| Type | When | What it shows |
|------|------|---------------|
| **Greeting** | First 10s, low intent | Welcome message, product summary |
| **Feature** | Deep engagement on feature section | Feature deep-dive, stats |
| **Pricing** | Extended reading on pricing | Plan comparison table |
| **Engagement** | High overall intent | Social proof, aggregated stats |
| **Comparison** | Back-and-forth between sections | Side-by-side comparison |

## Your Backend (the `onQuery` callback)

Dendron sends a `DendronContextPayload` to your callback. You forward it to your LLM and return a `SmartCard` JSON object.

```ts
// pages/api/dendron.ts (Next.js example)
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: req.body.prompt }],
    response_format: { type: 'json_object' },
  });
  res.json(JSON.parse(completion.choices[0].message.content));
}
```

Works with any LLM provider: OpenAI, Anthropic, Groq, Ollama, etc.

## Configuration

```js
Dendron.init({
  onQuery: async (payload) => { /* required */ },

  tracking: {
    scrollDebounce: 200,       // ms
    cursorDebounce: 300,       // ms
    readingInterval: 1000,     // ms
    mutationFlushInterval: 500 // ms
  },

  intent: {
    triggerThreshold: 55,      // 0-100
    cooldownSeconds: 30,
    maxCardsPerSession: 5
  },

  storage: {
    maxStorageMB: 25,
    embeddingTTLDays: 7,
    cleanupIntervalMinutes: 5
  },

  ui: {
    position: 'bottom-right',  // or 'bottom-left'
    theme: 'auto',             // 'light' | 'dark' | 'auto'
    branding: true,
    zIndex: 999999
  },

  systemContext: 'Your product description here',
  webMCP: false,               // WebMCP agent-readiness plugin
  debug: false                 // devtools overlay
});
```

## Event Hooks

```js
Dendron.on('trigger', (payload) => {
  analytics.track('dendron_trigger', { score: payload.trigger.score });
});

Dendron.on('card:rendered', (card) => console.log('Card:', card.type));
Dendron.on('card:action', (action) => router.push(action.href));
Dendron.on('error', (err) => Sentry.captureException(err));
```

## Framework Integration

**React / Next.js**
```jsx
'use client';
import { useEffect } from 'react';
import { Dendron } from '@dendron-sdk/core';

export default function Layout({ children }) {
  useEffect(() => {
    Dendron.init({ onQuery: async (p) => (await fetch('/api/dendron', { method: 'POST', body: JSON.stringify(p) })).json() });
    return () => Dendron.destroy();
  }, []);
  return <>{children}</>;
}
```

**Vue / Nuxt**
```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'
import { Dendron } from '@dendron-sdk/core'

onMounted(() => {
  Dendron.init({ onQuery: async (p) => (await $fetch('/api/dendron', { method: 'POST', body: p })) })
})
onUnmounted(() => Dendron.destroy())
</script>
```

## Running the Demo

```bash
# Clone and install
git clone https://github.com/bitWise72/dendron.git
cd dendron && npm install

# Build the SDK
npm run build

# Start mock LLM backend
node demo/mock-backend.js

# In another terminal, serve the demo
npx vite demo
```

Open the demo page, scroll around, and watch Smart Cards appear based on your behavior.

## Development

```bash
npm run build          # Production build (ESM + CJS + UMD + types)
npm run test           # Run test suite (67 tests)
npm run typecheck      # TypeScript strict check
npm run lint           # ESLint
npm run dev            # Dev server for demo
```

## Architecture

| Module | Runs In | Responsibility |
|--------|---------|----------------|
| **Tracker** | Web Worker + Main Thread listeners | DOM observation, scroll/cursor/click capture |
| **Context Engine** | Web Worker | Signal aggregation, intent scoring |
| **Prompt Builder** | Main Thread | Assembles LLM-ready prompts from context |
| **Card Renderer** | Main Thread (Shadow DOM) | Parses LLM response, renders Smart Cards |
| **Micro-Embeddings** | Web Worker (optional) | Behavioral pattern vectors via Transformers.js |
| **WebMCP Plugin** | Main Thread (optional) | Agent-readiness for agentic browsers |

## Security

- **No API keys in browser** — BYOK callback pattern eliminates exposure
- **No innerHTML on user/LLM content** — DOM API only (createElement/textContent)
- **Shadow DOM isolation** — closed shadow root, no CSS leakage
- **Zero network requests** — Dendron makes no calls; only your `onQuery` does
- **CSP compatible** — no eval(), no inline handlers
- **0 production vulnerabilities** — `npm audit --omit=dev` clean

## Bundle Size

| Component | Size (gzipped) |
|-----------|---------------|
| Core SDK | **13KB** |
| Micro-Embeddings (lazy, optional) | ~25MB (loaded on first trigger) |
| WebMCP Plugin (tree-shaken if unused) | ~2KB |

## License

MIT
