/**
 * Memory management store — list, search, delete operations and WebSocket handlers.
 */

import { writable } from 'svelte/store';
import type { MemoryEntry } from '@luciaclaw/protocol';
import { wsClient } from './websocket.js';

/** List of memory entries */
export const memories = writable<MemoryEntry[]>([]);

/** Total count (for pagination) */
export const memoryTotal = writable<number>(0);

/** Request memories list from the CVM */
export function requestMemories(category?: string, limit = 50, offset = 0): void {
  const payload: Record<string, unknown> = { limit, offset };
  if (category) payload.category = category;

  wsClient.send({
    id: crypto.randomUUID(),
    type: 'memory.list',
    timestamp: Date.now(),
    payload,
  });
}

/** Search memories by text query */
export function searchMemories(query: string, category?: string, limit = 20): void {
  const payload: Record<string, unknown> = { query, limit };
  if (category) payload.category = category;

  wsClient.send({
    id: crypto.randomUUID(),
    type: 'memory.search',
    timestamp: Date.now(),
    payload,
  });
}

/** Delete a memory entry */
export function deleteMemory(memoryId: string): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'memory.delete',
    timestamp: Date.now(),
    payload: { memoryId },
  });
}

/** Set up message handlers for memory responses */
export function initMemoryHandlers(): void {
  wsClient.on('memory.response', (msg) => {
    const payload = msg.payload as { memories: MemoryEntry[]; total?: number };
    memories.set(payload.memories);
    if (payload.total !== undefined) memoryTotal.set(payload.total);
  });
}
