/**
 * Conversation management stores.
 */

import { writable, derived } from 'svelte/store';
import type { ConversationSummary, ChatMessage } from '@luciaclaw/protocol';
import { wsClient } from './websocket.js';
import { messages, clearMessages } from './chat.js';

/** List of conversation summaries */
export const conversations = writable<ConversationSummary[]>([]);

/** Currently active conversation ID */
export const activeConversationId = writable<string | null>(null);

/** Whether conversation list is loading */
export const conversationsLoading = writable(false);

/** Conversation count */
export const conversationCount = derived(conversations, ($c) => $c.length);

/** Request the list of conversations from the CVM */
export function requestConversations(): void {
  conversationsLoading.set(true);
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'conversations.list',
    timestamp: Date.now(),
    payload: { limit: 50 },
  });
  // Fallback: stop loading if no response within 5s
  setTimeout(() => conversationsLoading.set(false), 5000);
}

/** Load a specific conversation's messages */
export function loadConversation(conversationId: string): void {
  activeConversationId.set(conversationId);
  clearMessages();
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'conversations.load',
    timestamp: Date.now(),
    payload: { conversationId, limit: 100 },
  });
}

/** Start a new conversation */
export function startNewConversation(): void {
  activeConversationId.set(null);
  clearMessages();
}

/** Delete a conversation */
export function deleteConversation(conversationId: string): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'conversations.delete',
    timestamp: Date.now(),
    payload: { conversationId },
  });
}

let conversationHandlersInitialized = false;

/** Set up message handlers for conversation responses */
export function initConversationHandlers(): void {
  if (conversationHandlersInitialized) return;
  conversationHandlersInitialized = true;

  wsClient.on('conversations.response', (msg) => {
    const payload = msg.payload as {
      conversations?: ConversationSummary[];
      messages?: ChatMessage[];
      conversationId?: string;
      totalMessages?: number;
    };

    if (payload.conversations) {
      conversations.set(payload.conversations);
      conversationsLoading.set(false);
    }

    if (payload.messages && payload.conversationId) {
      // Load messages into the chat store
      messages.set(payload.messages);
      activeConversationId.set(payload.conversationId);
    }
  });
}
