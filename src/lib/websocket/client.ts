/**
 * Secure WebSocket client with E2E encryption.
 *
 * Handles ECDH handshake, message encryption/decryption,
 * auto-reconnect, and pre-handshake message queuing.
 */

import type {
  MessageEnvelope,
  EncryptedEnvelope,
  HandshakeResponsePayload,
} from '@luciaclaw/protocol';
import { PROTOCOL_VERSION } from '@luciaclaw/protocol';
import {
  generateECDHKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  encrypt,
  decrypt,
} from '../crypto/e2e.js';

export type ConnectionState = 'disconnected' | 'connecting' | 'handshaking' | 'encrypted' | 'error';
export type MessageHandler = (msg: MessageEnvelope) => void;

interface SecureWSOptions {
  /** Max reconnect attempts before giving up */
  maxReconnectAttempts?: number;
  /** Base delay for exponential backoff (ms) */
  reconnectBaseDelay?: number;
}

export class SecureWebSocketClient {
  private ws: WebSocket | null = null;
  private sessionKey: CryptoKey | null = null;
  private keyPair: CryptoKeyPair | null = null;
  private state: ConnectionState = 'disconnected';
  private messageQueue: MessageEnvelope[] = [];
  private handlers = new Map<string, Set<MessageHandler>>();
  private stateHandlers = new Set<(state: ConnectionState) => void>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url = '';
  private maxReconnectAttempts: number;
  private reconnectBaseDelay: number;

  constructor(options: SecureWSOptions = {}) {
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.reconnectBaseDelay = options.reconnectBaseDelay ?? 1000;
  }

  /** Current connection state */
  getState(): ConnectionState {
    return this.state;
  }

  /** Connect to a WebSocket URL and perform E2E handshake. */
  async connect(url: string): Promise<void> {
    this.url = url;
    this.setState('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
      } catch (err) {
        this.setState('error');
        reject(err);
        return;
      }

      this.ws.onopen = async () => {
        try {
          await this.performHandshake();
          this.reconnectAttempts = 0;
          resolve();
        } catch (err) {
          this.setState('error');
          reject(err);
        }
      };

      this.ws.onmessage = (event) => {
        this.handleRawMessage(event.data);
      };

      this.ws.onclose = () => {
        if (this.state !== 'error') {
          this.setState('disconnected');
        }
        this.sessionKey = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setState('error');
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  /** Send a message (encrypted after handshake). */
  async send(message: MessageEnvelope): Promise<void> {
    if (this.state !== 'encrypted' || !this.sessionKey) {
      this.messageQueue.push(message);
      return;
    }
    await this.sendEncrypted(message);
  }

  /** Register a handler for a specific message type (or '*' for all). */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  /** Register a handler for connection state changes. */
  onStateChange(handler: (state: ConnectionState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  /** Close the connection and stop reconnecting. */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent reconnect
    this.ws?.close();
    this.ws = null;
    this.sessionKey = null;
    this.setState('disconnected');
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    for (const handler of this.stateHandlers) {
      handler(state);
    }
  }

  private async performHandshake(): Promise<void> {
    this.setState('handshaking');
    this.keyPair = await generateECDHKeyPair();
    const publicKeyBase64 = await exportPublicKey(this.keyPair.publicKey);

    // Step 1: Send client public key
    const initMsg: MessageEnvelope = {
      id: crypto.randomUUID(),
      type: 'handshake.init',
      timestamp: Date.now(),
      payload: {
        clientPublicKey: publicKeyBase64,
        protocolVersion: PROTOCOL_VERSION,
      },
    };
    this.ws!.send(JSON.stringify(initMsg));

    // Step 2: Wait for server response with public key + attestation
    const response = await this.waitForMessage('handshake.response');
    const { serverPublicKey } = response.payload as HandshakeResponsePayload;

    // Derive shared secret
    const serverKey = await importPublicKey(serverPublicKey);
    this.sessionKey = await deriveSharedSecret(this.keyPair.privateKey, serverKey);

    // Step 3: Send encrypted handshake complete
    const completeMsg: MessageEnvelope = {
      id: crypto.randomUUID(),
      type: 'handshake.complete',
      timestamp: Date.now(),
      payload: { status: 'ok' },
    };
    await this.sendEncrypted(completeMsg);
    this.setState('encrypted');

    // Flush queued messages
    await this.flushQueue();
  }

  private async sendEncrypted(message: MessageEnvelope): Promise<void> {
    if (!this.sessionKey || !this.ws) return;
    const plaintext = JSON.stringify(message);
    const { iv, ciphertext } = await encrypt(this.sessionKey, plaintext);
    const envelope: EncryptedEnvelope = {
      id: crypto.randomUUID(),
      type: 'encrypted',
      timestamp: Date.now(),
      payload: { iv, ciphertext },
    };
    this.ws.send(JSON.stringify(envelope));
  }

  private async handleRawMessage(data: string | ArrayBuffer): Promise<void> {
    try {
      const raw = typeof data === 'string' ? data : new TextDecoder().decode(data);
      const envelope: MessageEnvelope = JSON.parse(raw);

      if (envelope.type === 'encrypted' && this.sessionKey) {
        const { iv, ciphertext } = envelope.payload as { iv: string; ciphertext: string };
        const decrypted = await decrypt(this.sessionKey, iv, ciphertext);
        const inner: MessageEnvelope = JSON.parse(decrypted);
        this.dispatch(inner);
      } else {
        this.dispatch(envelope);
      }
    } catch {
      // Silently drop unparseable messages
    }
  }

  private dispatch(msg: MessageEnvelope): void {
    const typeHandlers = this.handlers.get(msg.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) handler(msg);
    }
    const wildcard = this.handlers.get('*');
    if (wildcard) {
      for (const handler of wildcard) handler(msg);
    }
  }

  private waitForMessage(type: string, timeoutMs = 10000): Promise<MessageEnvelope> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${type}`));
      }, timeoutMs);

      const handler = (event: MessageEvent) => {
        try {
          const msg: MessageEnvelope = JSON.parse(
            typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data)
          );
          if (msg.type === type) {
            clearTimeout(timer);
            this.ws!.removeEventListener('message', handler);
            resolve(msg);
          }
        } catch {
          // ignore parse errors during handshake
        }
      };
      this.ws!.addEventListener('message', handler);
    });
  }

  private async flushQueue(): Promise<void> {
    const queued = [...this.messageQueue];
    this.messageQueue = [];
    for (const msg of queued) {
      await this.sendEncrypted(msg);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts);
    const jitter = delay * (0.5 + Math.random() * 0.5);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.url).catch(() => {});
    }, jitter);
  }
}
