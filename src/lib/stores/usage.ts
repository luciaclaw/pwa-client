/**
 * Usage tracking store — request and display credit/token usage via WebSocket.
 */

import { writable } from 'svelte/store';
import type { UsageSummary } from '@luciaclaw/protocol';
import { wsClient } from './websocket.js';

/** Current usage summary from the CVM */
export const usageSummary = writable<UsageSummary | null>(null);

/** Whether a usage request is in flight */
export const usageLoading = writable(false);

/** Current period selection */
export const usagePeriod = writable<'day' | 'month'>('day');

/** Request usage summary for a given period */
export function requestUsage(period: 'day' | 'month'): void {
  usageLoading.set(true);
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'usage.list',
    timestamp: Date.now(),
    payload: { period },
  });
}

/** Set daily and/or monthly credit limits */
export function setUsageLimits(daily?: number | null, monthly?: number | null): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'usage.set_limits',
    timestamp: Date.now(),
    payload: { daily, monthly },
  });
}

let usageHandlersInitialized = false;

/** Set up message handler for usage.response */
export function initUsageHandlers(): void {
  if (usageHandlersInitialized) return;
  usageHandlersInitialized = true;

  wsClient.on('usage.response', (msg) => {
    const payload = msg.payload as UsageSummary;
    usageSummary.set(payload);
    usageLoading.set(false);
  });
}
