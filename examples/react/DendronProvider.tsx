// ============================================================
// DENDRON SDK — REACT / NEXT.JS INTEGRATION EXAMPLE
// ============================================================
//
// USAGE (Next.js App Router):
//   1. npm install @dendron-sdk/core
//   2. Wrap your root layout with <DendronProvider>
//   3. Add your backend proxy (see below)
//
// The component is 'use client' and SSR-safe.
// Dendron only initializes in the browser.

'use client';

import { useEffect, createContext, useContext, useRef, type ReactNode } from 'react';
import { Dendron } from '@dendron-sdk/core';
import type {
  DendronConfig,
  DendronEventMap,
  DendronEventName,
  SmartCardAction,
  SmartCardType,
} from '@dendron-sdk/core';

// ─── Context ─────────────────────────────────────────────────

interface DendronContextValue {
  on: <K extends DendronEventName>(
    event: K,
    handler: (data: DendronEventMap[K]) => void
  ) => () => void;
  destroy: () => void;
}

const DendronContext = createContext<DendronContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────

interface DendronProviderProps {
  children: ReactNode;
  config: DendronConfig;
}

/**
 * DendronProvider — Wraps your app to initialize the Dendron SDK.
 * Place in your root layout or _app.tsx.
 *
 * @example
 * // app/layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <DendronProvider config={{
 *           onQuery: async (payload) => {
 *             const res = await fetch('/api/dendron', {
 *               method: 'POST',
 *               body: JSON.stringify(payload)
 *             });
 *             return res.json();
 *           },
 *           systemContext: 'My SaaS product description here...',
 *         }}>
 *           {children}
 *         </DendronProvider>
 *       </body>
 *     </html>
 *   );
 * }
 */
export function DendronProvider({ children, config }: DendronProviderProps) {
  const initializedRef = useRef(false);

  useEffect(() => {
    // Guard: only init once, only in browser
    if (initializedRef.current) return;
    if (typeof window === 'undefined') return;

    initializedRef.current = true;
    Dendron.init(config);

    return () => {
      Dendron.destroy();
      initializedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const contextValue: DendronContextValue = {
    on: Dendron.on,
    destroy: Dendron.destroy,
  };

  return (
    <DendronContext.Provider value={contextValue}>
      {children}
    </DendronContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * useDendron — Access Dendron event subscriptions from any component.
 *
 * @example
 * function Analytics() {
 *   const dendron = useDendron();
 *   useEffect(() => {
 *     const unsub = dendron.on('trigger', (payload) => {
 *       trackEvent('dendron_trigger', { score: payload.trigger.score });
 *     });
 *     return unsub;
 *   }, []);
 *   return null;
 * }
 */
export function useDendron(): DendronContextValue {
  const ctx = useContext(DendronContext);
  if (!ctx) {
    throw new Error('useDendron must be used within a <DendronProvider>');
  }
  return ctx;
}

/**
 * useDendronEvent — Subscribe to a specific Dendron event.
 * Automatically unsubscribes when the component unmounts.
 *
 * @example
 * function CardTracker() {
 *   useDendronEvent('card:rendered', (card) => {
 *     console.log('Card shown:', card.type);
 *   });
 *   return null;
 * }
 */
export function useDendronEvent<K extends DendronEventName>(
  event: K,
  handler: (data: DendronEventMap[K]) => void
): void {
  const dendron = useDendron();
  useEffect(() => dendron.on(event, handler), [event, handler]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── Exports ─────────────────────────────────────────────────

export type { DendronConfig, SmartCardAction, SmartCardType };

// ─── Example Backend Proxy ────────────────────────────────────
/*
// app/api/dendron/route.ts (Next.js App Router)

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildPrompt } from '@dendron-sdk/core'; // if exported

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const payload = await req.json();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an embedded behavioral AI. Respond only with valid JSON matching the SmartCard schema.',
      },
      {
        role: 'user',
        content: JSON.stringify(payload),
      }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 400,
  });

  const card = JSON.parse(completion.choices[0].message.content ?? '{}');
  return NextResponse.json(card);
}
*/
