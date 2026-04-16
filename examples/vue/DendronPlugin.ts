// ============================================================
// DENDRON SDK — VUE / NUXT INTEGRATION EXAMPLE
// ============================================================
//
// USAGE (Vue 3 / Nuxt 3):
//   1. npm install @dendron-sdk/core
//   2. Register the plugin in your app
//   3. Add your backend proxy
//
// Auto-detects Nuxt SSR context — only runs on client.

import type { App, Plugin } from 'vue';
import { Dendron } from '@dendron-sdk/core';
import type {
  DendronConfig,
  DendronEventMap,
  DendronEventName,
} from '@dendron-sdk/core';
import { inject, onMounted, onUnmounted, type InjectionKey } from 'vue';

// ─── Injection Key ───────────────────────────────────────────

interface DendronInstance {
  on: <K extends DendronEventName>(
    event: K,
    handler: (data: DendronEventMap[K]) => void
  ) => () => void;
  destroy: () => void;
}

export const DendronKey: InjectionKey<DendronInstance> = Symbol('dendron');

// ─── Vue Plugin ──────────────────────────────────────────────

/**
 * createDendronPlugin — Vue 3 plugin that initializes Dendron on mount.
 *
 * @example
 * // main.ts
 * import { createApp } from 'vue'
 * import { createDendronPlugin } from './DendronPlugin'
 * import App from './App.vue'
 *
 * const app = createApp(App)
 * app.use(createDendronPlugin({
 *   onQuery: async (payload) => {
 *     const res = await fetch('/api/dendron', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(payload)
 *     })
 *     return res.json()
 *   },
 *   systemContext: 'My product description...',
 * }))
 * app.mount('#app')
 */
export function createDendronPlugin(config: DendronConfig): Plugin {
  return {
    install(app: App) {
      const instance: DendronInstance = {
        on: Dendron.on,
        destroy: Dendron.destroy,
      };

      app.provide(DendronKey, instance);

      // Initialize on client only
      if (typeof window !== 'undefined') {
        // Use nextTick to ensure DOM is available
        app.mixin({
          mounted() {
            // Only init once (first component mount)
            if (!(window as unknown as Record<string, boolean>).__dendron_init) {
              (window as unknown as Record<string, boolean>).__dendron_init = true;
              Dendron.init(config);
            }
          },
        });
      }

      // Cleanup on app unmount
      app.config.globalProperties.$dendron = instance;
    },
  };
}

// ─── Composable ──────────────────────────────────────────────

/**
 * useDendron — Composable for accessing Dendron in any component.
 *
 * @example
 * <script setup>
 * import { useDendron } from './DendronPlugin'
 *
 * const dendron = useDendron()
 * const unsub = dendron.on('card:rendered', (card) => {
 *   console.log('Card shown:', card.type)
 * })
 *
 * onUnmounted(unsub)
 * </script>
 */
export function useDendron(): DendronInstance {
  const dendron = inject(DendronKey);
  if (!dendron) {
    throw new Error('useDendron() requires the Dendron plugin. Did you call app.use(createDendronPlugin(...))?');
  }
  return dendron;
}

/**
 * useDendronEvent — Auto-subscribes to a Dendron event with cleanup.
 *
 * @example
 * <script setup>
 * import { useDendronEvent } from './DendronPlugin'
 *
 * useDendronEvent('trigger', (payload) => {
 *   console.log('Intent score:', payload.trigger.score)
 * })
 * </script>
 */
export function useDendronEvent<K extends DendronEventName>(
  event: K,
  handler: (data: DendronEventMap[K]) => void
): void {
  const dendron = useDendron();
  let unsub: (() => void) | null = null;

  onMounted(() => {
    unsub = dendron.on(event, handler);
  });

  onUnmounted(() => {
    unsub?.();
  });
}

// ─── Nuxt 3 Auto-Plugin ──────────────────────────────────────
/*
// plugins/dendron.client.ts (Nuxt 3)
// Note the .client suffix — Nuxt will only load this in the browser.

import { createDendronPlugin } from '~/lib/DendronPlugin'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(createDendronPlugin({
    onQuery: async (payload) => {
      const { data } = await useFetch('/api/dendron', {
        method: 'POST',
        body: payload,
      })
      return data.value
    },
    systemContext: useRuntimeConfig().public.dendronContext,
  }))
})
*/
