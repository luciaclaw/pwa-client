/**
 * Preferences store — get/set user preferences via WebSocket.
 */

import { writable } from 'svelte/store';
import { wsClient } from './websocket.js';

/** All preferences as key-value pairs */
export const preferences = writable<Record<string, string>>({});

/** Whether preferences have been loaded from the server */
export const preferencesLoaded = writable(false);

/** Request all preferences from the CVM */
export function requestPreferences(): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'preferences.list',
    timestamp: Date.now(),
    payload: {},
  });
}

/** Set a preference key-value pair on the CVM */
export function setPreference(key: string, value: string): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'preferences.set',
    timestamp: Date.now(),
    payload: { key, value },
  });
}

/** Set up message handlers for preferences responses */
export function initPreferencesHandlers(): void {
  wsClient.on('preferences.response', (msg) => {
    const payload = msg.payload as { preferences: Record<string, string> };
    preferences.set(payload.preferences);
    preferencesLoaded.set(true);
  });
}
