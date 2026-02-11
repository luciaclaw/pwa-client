/**
 * Chat messages store.
 */

import { writable, derived } from 'svelte/store';
import type { ChatMessage } from '@luciaclaw/protocol';

export const messages = writable<ChatMessage[]>([]);

export const messageCount = derived(messages, ($msgs) => $msgs.length);

export function addMessage(msg: ChatMessage): void {
  messages.update((msgs) => [...msgs, msg]);
}

export function clearMessages(): void {
  messages.set([]);
}
