/**
 * Persisted WebSocket URL store.
 *
 * Centralises the CVM endpoint so all pages share the same URL.
 * Persisted in localStorage so user-configured URLs survive navigation and reloads.
 */

import { writable, get } from 'svelte/store';

const STORAGE_KEY = 'lucia_ws_url';
const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'wss://318943fa6292b8b45307ce52afb524a9f124de2b-8080.dstack-pha-prod9.phala.network/ws';

function loadUrl(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_WS_URL;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // Corrupt or unavailable — use default
  }
  return DEFAULT_WS_URL;
}

export const wsUrl = writable<string>(loadUrl());

/** Update the WebSocket URL and persist to localStorage. */
export function setWsUrl(url: string): void {
  wsUrl.set(url);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, url);
  }
}

/** Get the current WebSocket URL synchronously. */
export function getWsUrl(): string {
  return get(wsUrl);
}
