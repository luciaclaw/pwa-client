/**
 * Svelte store wrapping SecureWebSocketClient.
 */

import { writable, derived } from 'svelte/store';
import { SecureWebSocketClient, type ConnectionState } from '../websocket/client.js';

const client = new SecureWebSocketClient();

export const connectionState = writable<ConnectionState>('disconnected');

client.onStateChange((state) => {
  connectionState.set(state);
});

export const isConnected = derived(connectionState, ($state) => $state === 'encrypted');

export async function connect(url: string): Promise<void> {
  await client.connect(url);
}

export function disconnect(): void {
  client.disconnect();
}

export { client as wsClient };
