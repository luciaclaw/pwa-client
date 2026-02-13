/**
 * Chat messages store.
 */

import { writable, derived } from 'svelte/store';
import type { ChatMessage } from '@luciaclaw/protocol';

export const messages = writable<ChatMessage[]>([]);

export const messageCount = derived(messages, ($msgs) => $msgs.length);

export function addMessage(msg: ChatMessage): void {
  messages.update((msgs) => {
    // Deduplicate: skip if a message with the same ID already exists
    if (msgs.some((m) => m.messageId === msg.messageId)) return msgs;
    return [...msgs, msg];
  });
}

export function clearMessages(): void {
  messages.set([]);
}
