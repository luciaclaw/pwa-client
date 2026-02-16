/**
 * Memory management store — list, search, delete, export, import operations and WebSocket handlers.
 */

import { writable } from 'svelte/store';
import type { MemoryEntry, MemoryExportResponsePayload, MemoryImportResponsePayload } from '@luciaclaw/protocol';
import { wsClient } from './websocket.js';

/** List of memory entries */
export const memories = writable<MemoryEntry[]>([]);

/** Total count (for pagination) */
export const memoryTotal = writable<number>(0);

/** Latest export data from the CVM */
export const exportData = writable<MemoryExportResponsePayload | null>(null);

/** Latest import result from the CVM */
export const importResult = writable<MemoryImportResponsePayload | null>(null);

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

/** Request a full memory export from the CVM */
export function requestMemoryExport(includePreferences = true): void {
  exportData.set(null);
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'memory.export',
    timestamp: Date.now(),
    payload: { includePreferences },
  });
}

/** Send imported data to the CVM */
export function requestMemoryImport(
  data: { memories: Array<{ content: string; category: string }>; preferences?: Record<string, string> },
  mode: 'merge' | 'replace' = 'merge',
): void {
  importResult.set(null);
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'memory.import',
    timestamp: Date.now(),
    payload: { data, mode },
  });
}

/** Set up message handlers for memory responses */
export function initMemoryHandlers(): void {
  wsClient.on('memory.response', (msg) => {
    const payload = msg.payload as { memories: MemoryEntry[]; total?: number };
    memories.set(payload.memories);
    if (payload.total !== undefined) memoryTotal.set(payload.total);
  });

  wsClient.on('memory.export.response', (msg) => {
    exportData.set(msg.payload as MemoryExportResponsePayload);
  });

  wsClient.on('memory.import.response', (msg) => {
    importResult.set(msg.payload as MemoryImportResponsePayload);
  });
}
