// ============================================================
// DENDRON SDK — MOCK LLM BACKEND
// A standalone Node.js mock backend for local development.
// Run: node demo/mock-backend.js
// Then point your onQuery to http://localhost:3001/api/dendron
//
// In production, replace this with your actual backend that
// forwards to your chosen LLM provider (OpenAI, Anthropic, Groq).
// ============================================================

const http = require('http');

const PORT = 3001;

/**
 * Generates a contextually appropriate Smart Card based on
 * the visitor's behavioral payload from Dendron.
 *
 * @param {import('../src/types').DendronContextPayload} payload
 * @returns {import('../src/types').SmartCard}
 */
function generateSmartCard(payload) {
  const focus = payload.visitor?.focusSection || payload.trigger?.sectionId || '';
  const score = payload.visitor?.intentScore || 0;
  const scrollDepth = payload.visitor?.scrollDepth || 0;
  const readingTime = payload.visitor?.totalReadingTime || 0;
  const sections = payload.page?.sections || [];

  console.log(`\n[Mock LLM] Generating Smart Card`);
  console.log(`  Focus section: ${focus}`);
  console.log(`  Intent score: ${score}/100`);
  console.log(`  Scroll depth: ${scrollDepth}%`);
  console.log(`  Reading time: ${readingTime}s`);
  console.log(`  Sections engaged: ${sections.filter(s => s.readingTime > 0).map(s => s.id).join(', ')}`);

  // Pricing section engagement
  if (focus.toLowerCase().includes('pricing') || sections.some(s => s.id.includes('pricing') && s.readingTime > 3)) {
    return {
      type: 'pricing',
      headline: 'Looks like you\'re evaluating our plans',
      plans: [
        {
          name: 'Free',
          price: '$0',
          period: 'forever',
          highlight: false,
          features: [
            'Full SDK (MIT licensed)',
            'All 5 Smart Card types',
            'Community support'
          ]
        },
        {
          name: 'Pro',
          price: '$29',
          period: 'mo',
          highlight: true,
          features: [
            'Remove Dendron branding',
            'Analytics dashboard',
            'WebMCP agent plugin',
            'Priority support'
          ]
        }
      ],
      actions: [
        { label: 'Start Free Trial', href: '/signup', variant: 'primary' },
        { label: 'Compare plans', href: '/pricing', variant: 'secondary' }
      ]
    };
  }

  // Security/architecture deep reading
  if (focus.includes('security') || focus.includes('architecture')) {
    return {
      type: 'comparison',
      headline: 'Dendron vs. Traditional Analytics',
      items: [
        {
          name: 'Dendron',
          attributes: {
            'Data location': 'Browser only',
            'API keys': 'Never sees them',
            'Server required': 'No',
            'GDPR role': 'Not a processor'
          }
        },
        {
          name: 'Traditional',
          attributes: {
            'Data location': 'Central server',
            'API keys': 'Managed by vendor',
            'Server required': 'Yes',
            'GDPR role': 'Data processor'
          }
        }
      ],
      actions: [
        { label: 'Read security docs', href: '/docs/security', variant: 'primary' },
        { label: 'Talk to us', href: '/contact', variant: 'secondary' }
      ]
    };
  }

  // Feature section deep engagement
  if (focus.includes('feature') || focus.includes('tracker') || focus.includes('context')) {
    return {
      type: 'feature',
      headline: 'How Dendron\'s Tracker works',
      feature: 'Web Worker Architecture',
      description: 'Dendron runs all behavioral processing inside a dedicated Web Worker. Your page\'s main thread is never blocked — maximum performance with zero UI jank.',
      stats: [
        { label: 'CPU Budget', value: '<1ms' },
        { label: 'Max Listeners', value: '6' },
        { label: 'postMessage', value: '≤10/s' }
      ],
      actions: [
        { label: 'View source on GitHub', href: 'https://github.com/dendron-sdk', variant: 'primary' },
        { label: 'See all modules', href: '/docs/architecture', variant: 'secondary' }
      ]
    };
  }

  // High engagement, multiple sections
  if (score > 70 || (readingTime > 30 && sections.filter(s => s.readingTime > 2).length >= 3)) {
    return {
      type: 'engagement',
      headline: 'You\'re clearly doing serious research',
      body: 'Most developers who spend this much time with our docs are ready to run a quick proof of concept. Want me to walk you through the 5-minute setup?',
      socialProof: '"We went from curiosity to production integration in one afternoon." — Early access developer at a Series B startup',
      stats: [
        { label: 'Avg setup time', value: '5 min' },
        { label: 'Bundle size', value: '<50KB' },
        { label: 'Dependencies', value: '0 required' }
      ],
      actions: [
        { label: 'See the quickstart', href: '/docs/quickstart', variant: 'primary' },
        { label: 'Book a walkthrough', href: '/demo-call', variant: 'secondary' }
      ]
    };
  }

  // Default / low intent greeting
  return {
    type: 'greeting',
    headline: score > 25 ? 'You\'re getting the picture 👋' : 'Hey, I\'m Dendron',
    body: score > 25
      ? 'You\'ve been browsing for a bit — I can tell you\'re interested in the behavioral tracking side of things. Want me to show you how the Context Engine scores intent in real time?'
      : 'I track how visitors engage with pages and surface helpful information at the right moment. Right now I\'m watching your scroll depth and reading time — completely in your browser, nothing server-side.',
    actions: [
      {
        label: score > 25 ? 'Show me the Context Engine' : 'How does this work?',
        href: score > 25 ? '#architecture' : '#features',
        variant: 'primary'
      },
      { label: 'Not now', action: 'dismiss', variant: 'ghost' }
    ]
  };
}

// ─── HTTP Server ──────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/dendron') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);

        // Simulate LLM latency (500-1200ms)
        const delay = 500 + Math.random() * 700;
        setTimeout(() => {
          const card = generateSmartCard(payload);
          const json = JSON.stringify(card);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(json);

          console.log(`[Mock LLM] → Returned ${card.type} card (${delay.toFixed(0)}ms simulated latency)`);
        }, delay);

      } catch (err) {
        console.error('[Mock LLM] Parse error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Dendron Mock LLM Backend' }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n┌─────────────────────────────────────────────┐`);
  console.log(`│   Dendron Mock LLM Backend                  │`);
  console.log(`│                                             │`);
  console.log(`│   Listening on: http://localhost:${PORT}       │`);
  console.log(`│   Endpoint:     POST /api/dendron           │`);
  console.log(`│   Health:       GET  /health                │`);
  console.log(`│                                             │`);
  console.log(`│   Use in Dendron.init():                    │`);
  console.log(`│   onQuery: async (payload) => {             │`);
  console.log(`│     const r = await fetch(                  │`);
  console.log(`│       'http://localhost:${PORT}/api/dendron', │`);
  console.log(`│       { method: 'POST',                     │`);
  console.log(`│         body: JSON.stringify(payload) });   │`);
  console.log(`│     return r.json();                        │`);
  console.log(`│   }                                         │`);
  console.log(`└─────────────────────────────────────────────┘\n`);
});
