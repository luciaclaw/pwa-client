import { describe, it, expect } from 'vitest';
import { SecureWebSocketClient } from '../src/lib/websocket/client.js';

describe('SecureWebSocketClient', () => {
  it('starts in disconnected state', () => {
    const client = new SecureWebSocketClient();
    expect(client.getState()).toBe('disconnected');
  });

  it('registers and removes event handlers', () => {
    const client = new SecureWebSocketClient();
    const handler = () => {};
    const unsubscribe = client.on('chat.response', handler);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('registers and removes state change handlers', () => {
    const client = new SecureWebSocketClient();
    const states: string[] = [];
    const unsubscribe = client.onStateChange((state) => states.push(state));
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('disconnect sets state to disconnected', () => {
    const client = new SecureWebSocketClient();
    client.disconnect();
    expect(client.getState()).toBe('disconnected');
  });
});
